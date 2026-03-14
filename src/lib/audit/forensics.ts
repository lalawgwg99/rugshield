// ═══════════════════════════════════════════════════════════
// RugShield — Wallet Forensics Engine (v2: real tx parsing)
// ═══════════════════════════════════════════════════════════

import type { ForensicsReport, FundingSource, AssociatedWallet } from '@/types';
import { getSignaturesForAddress, getConnection } from './solana';
import { PublicKey } from '@solana/web3.js';

/** Analyze creator wallet for rug history and funding sources */
export async function analyzeCreatorWallet(
  creatorAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokenMint: string
): Promise<ForensicsReport> {
  try {
    const signatures = await getSignaturesForAddress(creatorAddress, 1000);
    const conn = getConnection();

    // Parse actual transactions to detect token creations
    const tokenCreations = await detectTokenCreations(conn, creatorAddress, signatures);
    const rugCount = await estimateRugCount(conn, tokenCreations);
    const rugRate = tokenCreations.length > 0
      ? (rugCount / tokenCreations.length) * 100
      : 0;

    // Trace funding sources with real balance analysis
    const fundingSources = await traceFundingSources(conn, creatorAddress, signatures);

    // Find associated wallets from funding patterns
    const associatedWallets = await findAssociatedWallets(conn, fundingSources);

    const { rating, ratingZh } = getBehaviorRating(rugRate, tokenCreations.length);

    return {
      creatorAddress,
      tokensCreated: tokenCreations.length,
      rugCount,
      rugRate,
      behaviorRating: rating,
      behaviorRatingZh: ratingZh,
      fundingSources,
      associatedWallets,
    };
  } catch {
    return {
      creatorAddress,
      tokensCreated: 0,
      rugCount: 0,
      rugRate: 0,
      behaviorRating: 'Unknown',
      behaviorRatingZh: '未知',
      fundingSources: [],
      associatedWallets: [],
    };
  }
}

/** Detect token creation transactions by parsing actual instructions */
async function detectTokenCreations(
  conn: ReturnType<typeof getConnection>,
  address: string,
  signatures: string[]
): Promise<string[]> {
  const createdMints: string[] = [];

  // Sample up to 50 recent transactions (balance API cost vs coverage)
  const sampleSigs = signatures.slice(0, Math.min(50, signatures.length));

  for (const sig of sampleSigs) {
    try {
      const tx = await conn.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta) continue;

      const accountKeys = tx.transaction.message.getAccountKeys();
      const logMessages = tx.meta.logMessages || [];

      // Look for InitializeMint or InitializeAccount instructions in logs
      const hasInitMint = logMessages.some(
        (log) =>
          log.includes('Instruction: InitializeMint') ||
          log.includes('Instruction: InitializeMint2')
      );

      if (hasInitMint) {
        // The mint account is typically the 2nd account in InitializeMint
        // Find accounts owned by token programs
        for (let i = 0; i < accountKeys.length; i++) {
          const owner = tx.meta.postTokenBalances?.find(
            (b) => b.accountIndex === i
          );
          if (owner) {
            const mint = owner.mint;
            if (mint && !createdMints.includes(mint)) {
              createdMints.push(mint);
            }
          }
        }

        // Fallback: if no token balances found, infer from log context
        if (createdMints.length === 0) {
          // Use the first non-signer account after the creator as likely mint
          for (let i = 0; i < accountKeys.length; i++) {
            const key = accountKeys.get(i);
            if (!key) continue;
            const keyStr = key.toBase58();
            if (keyStr !== address && !createdMints.includes(keyStr)) {
              createdMints.push(keyStr);
              break;
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  return createdMints;
}

/** Estimate rug count by checking token health indicators */
async function estimateRugCount(
  conn: ReturnType<typeof getConnection>,
  createdMints: string[]
): Promise<number> {
  if (createdMints.length === 0) return 0;

  let rugCount = 0;

  // Check each created token's current state
  // Sample up to 20 tokens to avoid rate limits
  const sampled = createdMints.slice(0, 20);

  for (const mint of sampled) {
    try {
      const supply = await conn.getTokenSupply(new PublicKey(mint));
      const supplyAmount = supply?.value?.uiAmount ?? 0;

      // A token with 0 supply or extremely low supply is likely rugged
      if (supplyAmount === 0) {
        rugCount++;
        continue;
      }

      // Check if there are any remaining holders
      const largestAccounts = await conn.getTokenLargestAccounts(new PublicKey(mint));
      const holders = largestAccounts?.value || [];

      if (holders.length === 0) {
        rugCount++;
        continue;
      }

      // Check if single wallet holds >95% (abandoned token)
      const totalSupply = holders.reduce(
        (sum, h) => sum + (h.uiAmount || 0),
        0
      );
      if (totalSupply > 0) {
        const topHolderPct =
          ((holders[0]?.uiAmount || 0) / totalSupply) * 100;
        if (topHolderPct > 95) {
          rugCount++;
        }
      }
    } catch {
      // If we can't fetch token data, skip (don't count as rug)
      continue;
    }
  }

  // Extrapolate if we sampled
  if (createdMints.length > sampled.length) {
    const rugRateInSample = rugCount / sampled.length;
    rugCount = Math.round(rugRateInSample * createdMints.length);
  }

  return rugCount;
}

/** Trace funding sources with actual balance change analysis */
async function traceFundingSources(
  conn: ReturnType<typeof getConnection>,
  address: string,
  signatures: string[]
): Promise<FundingSource[]> {
  const sources: FundingSource[] = [];
  const seenSenders = new Set<string>();

  try {
    // Analyze the earliest transactions (funding usually happens first)
    const fundingSigs = signatures.slice(-15);

    for (const sig of fundingSigs) {
      try {
        const tx = await conn.getTransaction(sig, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta) continue;

        const accountKeys = tx.transaction.message.getAccountKeys();
        const preBalances = tx.meta.preBalances || [];
        const postBalances = tx.meta.postBalances || [];

        for (let i = 0; i < accountKeys.length; i++) {
          const key = accountKeys.get(i);
          if (!key) continue;
          const keyStr = key.toBase58();
          if (keyStr === address) continue;
          if (seenSenders.has(keyStr)) continue;

          const balanceChange = (postBalances[i] || 0) - (preBalances[i] || 0);

          // Only track meaningful outgoing transfers (> 0.01 SOL)
          if (balanceChange < -10_000_000 && sources.length < 8) {
            seenSenders.add(keyStr);
            sources.push({
              from: keyStr,
              amount: Math.abs(balanceChange) / 1e9,
              token: 'SOL',
              rugHistory: 0, // Will be filled by findAssociatedWallets
            });
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Return empty on error
  }

  return sources;
}

/** Analyze associated wallets for rug history using on-chain data */
async function findAssociatedWallets(
  conn: ReturnType<typeof getConnection>,
  sources: FundingSource[]
): Promise<AssociatedWallet[]> {
  const wallets: AssociatedWallet[] = [];

  for (const source of sources) {
    try {
      // Check the funder's transaction history for token creation patterns
      const sigs = await conn.getSignaturesForAddress(
        new PublicKey(source.from),
        { limit: 100 }
      );

      const txCount = sigs?.length || 0;

      // High transaction count from a funding source is suspicious
      // (likely a bot or serial creator)
      if (txCount > 500) {
        source.rugHistory = Math.min(
          Math.floor(txCount / 100),
          10
        );
        wallets.push({
          address: source.from,
          relationship: 'funding_source',
          riskFlag: `High activity wallet (${txCount} txs) — likely bot/serial creator`,
        });
      } else if (txCount > 200) {
        source.rugHistory = Math.min(
          Math.floor(txCount / 200),
          5
        );
        wallets.push({
          address: source.from,
          relationship: 'funding_source',
          riskFlag: `Moderate activity (${txCount} txs)`,
        });
      }
    } catch {
      continue;
    }
  }

  return wallets;
}

/** Get behavior rating based on rug rate */
function getBehaviorRating(
  rugRate: number,
  tokenCount: number
): { rating: string; ratingZh: string } {
  if (tokenCount === 0) return { rating: 'New Creator', ratingZh: '新創建者' };
  if (rugRate >= 60) return { rating: '🚨 Serial Rugger', ratingZh: '🚨 慣犯' };
  if (rugRate >= 30) return { rating: '⚠️ Suspicious', ratingZh: '⚠️ 可疑' };
  if (rugRate >= 10) return { rating: '⚡ Caution', ratingZh: '⚡ 謹慎' };
  return { rating: '✅ Clean', ratingZh: '✅ 清白' };
}
