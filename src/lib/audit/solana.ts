// ═══════════════════════════════════════════════════════════
// RugShield — Solana RPC Client
// ═══════════════════════════════════════════════════════════

import { Connection, PublicKey } from '@solana/web3.js';
import type { TokenData, HolderData } from '@/types';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://rpc.solanatracker.io/public';

let connection: Connection | null = null;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, 'confirmed');
  }
  return connection;
}

/** Get SPL token supply info */
export async function getTokenSupply(mintAddress: string): Promise<{
  amount: string;
  decimals: number;
} | null> {
  try {
    const conn = getConnection();
    const mint = new PublicKey(mintAddress);
    const supply = await conn.getTokenSupply(mint);
    return {
      amount: supply.value.amount,
      decimals: supply.value.decimals,
    };
  } catch {
    return null;
  }
}

/** Get largest token accounts (top holders) */
export async function getTokenLargestAccounts(
  mintAddress: string,
  totalSupplyStr?: string
): Promise<HolderData[]> {
  try {
    const conn = getConnection();
    const mint = new PublicKey(mintAddress);
    const accounts = await conn.getTokenLargestAccounts(mint);
    
    let supplyNum = 1;
    if (totalSupplyStr) {
      supplyNum = Number(totalSupplyStr) || 1;
    } else {
      const supply = await getTokenSupply(mintAddress);
      supplyNum = supply ? Number(supply.amount) : 1;
    }

    return accounts.value.map((acc, i) => ({
      address: acc.address.toBase58(),
      amount: Number(acc.uiAmount || 0),
      percentage: supplyNum > 0 ? (Number(acc.amount) / supplyNum) * 100 : 0,
      isDev: i === 0,
    }));
  } catch {
    return [];
  }
}

/** Get account info for a Solana address */
export async function getAccountInfo(address: string) {
  try {
    const conn = getConnection();
    const pubkey = new PublicKey(address);
    const info = await conn.getAccountInfo(pubkey);
    return info;
  } catch {
    return null;
  }
}

/** Get recent transaction signatures for an address */
export async function getSignaturesForAddress(
  address: string,
  limit = 100
): Promise<string[]> {
  try {
    const conn = getConnection();
    const pubkey = new PublicKey(address);
    const sigs = await conn.getSignaturesForAddress(pubkey, { limit });
    return sigs.map((s) => s.signature);
  } catch {
    return [];
  }
}

/** Check if an address has freeze authority (is a mint with freeze) */
export async function checkFreezeAuthority(
  mintAddress: string
): Promise<boolean> {
  try {
    const conn = getConnection();
    const mint = new PublicKey(mintAddress);
    const info = await conn.getAccountInfo(mint);
    if (!info) return false;
    // Mint account layout: freeze authority is at offset 36-68 (if not all zeros)
    const freezeAuthBytes = info.data.slice(36, 68);
    return freezeAuthBytes.some((b) => b !== 0);
  } catch {
    return false;
  }
}

/** Check if mint has mint authority (can mint more tokens) */
export async function checkMintAuthority(
  mintAddress: string
): Promise<boolean> {
  try {
    const conn = getConnection();
    const mint = new PublicKey(mintAddress);
    const info = await conn.getAccountInfo(mint);
    if (!info) return false;
    // Mint account layout: mint authority at offset 4-36
    const mintAuthBytes = info.data.slice(4, 36);
    return mintAuthBytes.some((b) => b !== 0);
  } catch {
    return false;
  }
}

/** Get token basic info from the mint */
export async function getTokenBasicInfo(
  mintAddress: string
): Promise<Partial<TokenData> | null> {
  try {
    const supply = await getTokenSupply(mintAddress);
    if (!supply) return null;

    const conn = getConnection();
    const mint = new PublicKey(mintAddress);
    const signatures = await conn.getSignaturesForAddress(mint, { limit: 1 });

    return {
      address: mintAddress,
      decimals: supply.decimals,
      supply: supply.amount,
      createdAt: signatures[0]?.blockTime ? signatures[0].blockTime * 1000 : undefined,
    };
  } catch {
    return null;
  }
}

export { getConnection };
