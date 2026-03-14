// ═══════════════════════════════════════════════════════════
// RugShield — Price Impact Simulation (Bonding Curve)
// ═══════════════════════════════════════════════════════════

import type { SimulationResult, PriceImpact } from '@/types';
import type { HolderDistribution, MarketData } from '@/types';

/**
 * Simulate price impact of large sells on a bonding curve (pump.fun style).
 *
 * Pump.fun uses a constant-product bonding curve:
 *   price = k * (tokens_sold)^1.5 / (virtual_sol_reserves)^1.5
 *
 * We approximate this with linear + quadratic impact for simplicity.
 */
export function simulatePriceImpact(
  holders: HolderDistribution | null,
  market: MarketData | null
): SimulationResult {
  const impacts: PriceImpact[] = [];

  if (!market || !holders) {
    // Return default simulation
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
  const devHoldings = holders.devHoldings || 0;
  const topHolderPct = holders.topHolderPct || 0;

  // ── Scenario 1: #1 holder sells 10% of their position ──
  const sell1 = topHolderPct * 0.1;
  impacts.push({
    scenario: `Top holder sells 10% (${sell1.toFixed(1)}% of supply)`,
    scenarioZh: `#1 大戶賣出 10%（佔總量 ${sell1.toFixed(1)}%）`,
    sellPercent: 10,
    priceDropPercent: calculateImpact(sell1, liquidity),
  });

  // ── Scenario 2: Dev sells all ──
  impacts.push({
    scenario: `Dev sells all (${devHoldings.toFixed(1)}% of supply)`,
    scenarioZh: `Dev 全部賣出（佔總量 ${devHoldings.toFixed(1)}%）`,
    sellPercent: 100,
    priceDropPercent: calculateImpact(devHoldings, liquidity),
  });

  // ── Scenario 3: Top 3 holders coordinate sell ──
  const top3Pct = holders.holders
    .slice(0, 3)
    .reduce((sum, h) => sum + h.percentage, 0);
  impacts.push({
    scenario: `Top 3 holders sell 50% (${(top3Pct * 0.5).toFixed(1)}% of supply)`,
    scenarioZh: `前 3 大戶賣出 50%（佔總量 ${(top3Pct * 0.5).toFixed(1)}%）`,
    sellPercent: 50,
    priceDropPercent: calculateImpact(top3Pct * 0.5, liquidity),
  });

  // ── Scenario 4: Full rug (all dev + insiders) ──
  impacts.push({
    scenario: 'Full rug: dev + insiders sell everything',
    scenarioZh: '全面 Rug：Dev + 內部人全部賣出',
    sellPercent: 100,
    priceDropPercent: Math.min(98, calculateImpact(top3Pct, liquidity)),
  });

  return { impacts };
}

/**
 * Calculate price drop percentage using bonding curve approximation.
 *
 * For constant-product AMM: price_impact ≈ sell_pct / (1 + sell_pct) * (sell_amount / liquidity)
 * We add a quadratic term for bonding curve steepness.
 */
function calculateImpact(sellPct: number, liquidityUsd: number): number {
  // Base impact proportional to sell size vs liquidity
  const sellAmountUsd = (sellPct / 100) * liquidityUsd * 10; // Assume token value ~10x liq

  // Linear impact
  const linearImpact = (sellAmountUsd / liquidityUsd) * 100;

  // Quadratic (bonding curve) impact
  const quadraticImpact = Math.pow(sellPct / 100, 1.5) * 50;

  // Combined, capped at 99%
  const total = Math.min(99, linearImpact * 0.3 + quadraticImpact);

  return Math.round(total);
}
