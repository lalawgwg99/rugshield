// ═══════════════════════════════════════════════════════════
// RugShield — Price Impact Simulation (v2: Improved Model)
// ═══════════════════════════════════════════════════════════

import type { SimulationResult, PriceImpact } from '@/types';
import type { HolderDistribution, MarketData } from '@/types';

/**
 * Simulate price impact using constant-product AMM model.
 *
 * For a constant-product AMM (x * y = k):
 *   price_impact = 1 - (reserve_y / (reserve_y + sell_amount))
 *
 * pump.fun uses a variant with virtual reserves, so we model:
 *   effective_liquidity = reported_liquidity * depth_factor
 *   price_impact = sell_value / (effective_liquidity + sell_value)
 *
 * This replaces the previous linear+quadratic approximation which
 * overestimated impact for small sells and underestimated for large ones.
 */
export function simulatePriceImpact(
  holders: HolderDistribution | null,
  market: MarketData | null
): SimulationResult {
  const impacts: PriceImpact[] = [];

  if (!market || !holders) {
    return {
      impacts: [
        {
          scenario: 'Top holder sells 10%',
          scenarioZh: '#1 大戶賣出 10%',
          sellPercent: 10,
          priceDropPercent: 45,
        },
        {
          scenario: 'Dev sells all holdings',
          scenarioZh: 'Dev 全部賣出',
          sellPercent: 100,
          priceDropPercent: 92,
        },
        {
          scenario: 'Top 3 holders sell 50%',
          scenarioZh: '前 3 大戶賣出 50%',
          sellPercent: 50,
          priceDropPercent: 78,
        },
      ],
    };
  }

  const liquidity = market.liquidity || 1000;
  const marketCap = market.marketCap || liquidity;
  const devHoldings = holders.devHoldings || 0;
  const topHolderPct = holders.topHolderPct || 0;

  // ── Scenario 1: #1 holder sells 10% of their position ──
  const sell1Pct = topHolderPct * 0.1;
  impacts.push({
    scenario: `Top holder sells 10% (${sell1Pct.toFixed(1)}% of supply)`,
    scenarioZh: `#1 大戶賣出 10%（佔總量 ${sell1Pct.toFixed(1)}%）`,
    sellPercent: 10,
    priceDropPercent: calculateImpact(sell1Pct, marketCap, liquidity),
  });

  // ── Scenario 2: Dev sells all ──
  impacts.push({
    scenario: `Dev sells all (${devHoldings.toFixed(1)}% of supply)`,
    scenarioZh: `Dev 全部賣出（佔總量 ${devHoldings.toFixed(1)}%）`,
    sellPercent: 100,
    priceDropPercent: calculateImpact(devHoldings, marketCap, liquidity),
  });

  // ── Scenario 3: Top 3 holders coordinate sell ──
  const top3Pct = holders.holders
    .slice(0, 3)
    .reduce((sum, h) => sum + h.percentage, 0);
  impacts.push({
    scenario: `Top 3 holders sell 50% (${(top3Pct * 0.5).toFixed(1)}% of supply)`,
    scenarioZh: `前 3 大戶賣出 50%（佔總量 ${(top3Pct * 0.5).toFixed(1)}%）`,
    sellPercent: 50,
    priceDropPercent: calculateImpact(top3Pct * 0.5, marketCap, liquidity),
  });

  // ── Scenario 4: Full rug (dev + top 3 insiders) ──
  const fullRugPct = Math.min(100, devHoldings + top3Pct);
  impacts.push({
    scenario: 'Full rug: dev + insiders sell everything',
    scenarioZh: '全面 Rug：Dev + 內部人全部賣出',
    sellPercent: 100,
    priceDropPercent: calculateImpact(fullRugPct, marketCap, liquidity),
  });

  // ── Scenario 5: Panic sell cascade (20% of all holders exit) ──
  impacts.push({
    scenario: 'Panic cascade: 20% of holders exit',
    scenarioZh: '恐慌拋售：20% 持幣者出場',
    sellPercent: 20,
    priceDropPercent: calculateImpact(20, marketCap, liquidity),
  });

  return { impacts };
}

/**
 * Calculate price impact using constant-product AMM model.
 *
 * Model:
 *   sell_value = (sellPct / 100) * marketCap
 *   For constant-product: impact = sell_value / (liquidity + sell_value)
 *   We apply a depth factor to account for concentrated liquidity
 *   and bonding curve steepness.
 *
 * Depth factor:
 *   - Low liquidity (<$10K): 0.7 (thin book, higher impact)
 *   - Medium ($10-50K): 0.85
 *   - High (>$50K): 1.0 (deeper book, closer to theoretical)
 */
function calculateImpact(
  sellPct: number,
  marketCap: number,
  liquidityUsd: number
): number {
  if (sellPct <= 0 || liquidityUsd <= 0) return 0;

  // Depth factor: thinner books have worse execution
  let depthFactor: number;
  if (liquidityUsd < 10000) {
    depthFactor = 0.7;
  } else if (liquidityUsd < 50000) {
    depthFactor = 0.85;
  } else {
    depthFactor = 1.0;
  }

  const effectiveLiquidity = liquidityUsd * depthFactor;
  const sellValue = (sellPct / 100) * marketCap;

  // Constant-product AMM impact formula
  // price_impact = sell_value / (effective_liquidity + sell_value)
  const impact = (sellValue / (effectiveLiquidity + sellValue)) * 100;

  // Apply non-linear scaling for very large sells
  // Large sells face additional slippage from order book gaps
  let scaledImpact = impact;
  if (sellPct > 30) {
    const excessPct = (sellPct - 30) / 70; // 0 to 1 for 30-100%
    scaledImpact += excessPct * 15; // Up to 15% additional impact
  }

  return Math.min(99, Math.round(scaledImpact));
}
