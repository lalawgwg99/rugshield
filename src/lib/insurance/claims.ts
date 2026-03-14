// ═══════════════════════════════════════════════════════════
// RugShield — Claim Verification Logic
// ═══════════════════════════════════════════════════════════

import type { InsurancePolicy } from '@/types';
import { getMarketData } from '@/lib/audit/dexscreener';

export type ClaimResult =
  | { eligible: true; payoutAmount: number; reason: string; reasonZh: string }
  | { eligible: false; reason: string; reasonZh: string };

/**
 * Verify if an insurance claim is valid.
 *
 * Claim conditions:
 * 1. Token price dropped >90% within 24 hours of policy creation
 * 2. OR liquidity was completely removed
 * 3. Policy must be active and within claim window
 */
export async function verifyClaim(policy: InsurancePolicy): Promise<ClaimResult> {
  // Check if policy is active
  if (policy.status !== 'active') {
    return {
      eligible: false,
      reason: `Policy status is "${policy.status}", not active`,
      reasonZh: `保單狀態為「${policy.status}」，非有效狀態`,
    };
  }

  // Check if within claim window (24 hours)
  const now = Date.now();
  const claimWindowEnd = policy.createdAt + 24 * 60 * 60 * 1000;
  if (now > claimWindowEnd) {
    return {
      eligible: false,
      reason: 'Claim window has expired (24 hours)',
      reasonZh: '理賠窗口已過期（24 小時）',
    };
  }

  // Check token market data
  const market = await getMarketData(policy.tokenAddress);

  if (!market) {
    // Token no longer listed — likely rug
    return {
      eligible: true,
      payoutAmount: policy.payoutAmount,
      reason: 'Token appears to have been rugged (no longer listed)',
      reasonZh: '代幣疑似已被 Rug（已下架）',
    };
  }

  // Check for 90% price drop
  if (market.priceChange24h <= -90) {
    return {
      eligible: true,
      payoutAmount: policy.payoutAmount,
      reason: `Price dropped ${market.priceChange24h.toFixed(1)}% in 24h (>90% threshold)`,
      reasonZh: `價格在 24 小時內下跌 ${market.priceChange24h.toFixed(1)}%（超過 90% 門檻）`,
    };
  }

  // Check for liquidity removal
  if (market.liquidity < 100) {
    return {
      eligible: true,
      payoutAmount: policy.payoutAmount,
      reason: 'Liquidity effectively removed (<$100 remaining)',
      reasonZh: '流動性實質上已被移除（剩餘 <$100）',
    };
  }

  return {
    eligible: false,
    reason: `Price change: ${market.priceChange24h.toFixed(1)}%, liquidity: $${market.liquidity.toLocaleString()} — no qualifying event`,
    reasonZh: `價格變化: ${market.priceChange24h.toFixed(1)}%, 流動性: $${market.liquidity.toLocaleString()} — 未達理賠條件`,
  };
}

/**
 * Generate a claim ID
 */
export function generateClaimId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `CLM-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate a policy ID
 */
export function generatePolicyId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `POL-${timestamp}-${random}`.toUpperCase();
}
