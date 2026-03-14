// ═══════════════════════════════════════════════════════════
// RugShield — Insurance Premium Calculator
// ═══════════════════════════════════════════════════════════

import type { InsuranceQuote } from '@/types';

/**
 * Premium calculation based on risk score.
 *
 * Base premium = 3%
 * Risk adjustments:
 *   Score 8-10: 1%  (very safe)
 *   Score 5-7:  3%  (moderate)
 *   Score 3-4:  6%  (risky)
 *   Score 0-2:  10% (extremely risky, may be refused)
 */
export function calculatePremium(
  tokenAddress: string,
  tokenSymbol: string,
  purchaseAmount: number,
  riskScore: number
): InsuranceQuote {
  // Determine premium rate
  let premiumRate: number;
  let eligible = true;
  let reason: string | undefined;
  let reasonZh: string | undefined;

  if (riskScore >= 8) {
    premiumRate = 0.01; // 1%
  } else if (riskScore >= 5) {
    premiumRate = 0.03; // 3%
  } else if (riskScore >= 3) {
    premiumRate = 0.06; // 6%
  } else {
    premiumRate = 0.10; // 10%
    if (riskScore < 2) {
      eligible = false;
      reason = 'Token risk too high for insurance coverage';
      reasonZh = '代幣風險過高，無法提供保險';
    }
  }

  // Minimum purchase amount check
  if (purchaseAmount < 1) {
    eligible = false;
    reason = 'Minimum purchase amount is 1 USDC';
    reasonZh = '最低投保金額為 1 USDC';
  }

  // Maximum coverage check
  if (purchaseAmount > 10000) {
    eligible = false;
    reason = 'Maximum coverage is 10,000 USDC per policy';
    reasonZh = '每張保單最高保障 10,000 USDC';
  }

  const premium = eligible ? Math.round(purchaseAmount * premiumRate * 100) / 100 : 0;
  const payoutAmount = eligible ? Math.round(purchaseAmount * 0.5 * 100) / 100 : 0;

  return {
    tokenAddress,
    tokenSymbol,
    purchaseAmount,
    riskScore,
    premiumRate: premiumRate * 100, // Return as percentage
    premium,
    payoutAmount,
    eligible,
    reason,
    reasonZh,
  };
}

/**
 * Get premium tier description
 */
export function getPremiumTierDescription(score: number): {
  tier: string;
  tierZh: string;
  rate: string;
  description: string;
  descriptionZh: string;
} {
  if (score >= 8) {
    return {
      tier: 'Safe',
      tierZh: '安全',
      rate: '1%',
      description: 'Lowest premium — token appears safe',
      descriptionZh: '最低保費 — 代幣看起來安全',
    };
  }
  if (score >= 5) {
    return {
      tier: 'Standard',
      tierZh: '標準',
      rate: '3%',
      description: 'Standard premium — moderate risk',
      descriptionZh: '標準保費 — 中等風險',
    };
  }
  if (score >= 3) {
    return {
      tier: 'Risky',
      tierZh: '高風險',
      rate: '6%',
      description: 'Elevated premium — high risk token',
      descriptionZh: '較高保費 — 高風險代幣',
    };
  }
  return {
    tier: 'Extreme',
    tierZh: '極高風險',
    rate: '10%',
    description: 'Maximum premium — extremely risky or may be refused',
    descriptionZh: '最高保費 — 極高風險或可能被拒保',
  };
}
