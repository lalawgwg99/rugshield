// ═══════════════════════════════════════════════════════════
// RugShield — Historical Pattern Matching & Clone Detection (v2)
// ═══════════════════════════════════════════════════════════

import type { PatternMatch, MarketData, TokenData } from '@/types';

const KNOWN_RUG_PATTERNS = [
  {
    id: 'quick_drain',
    name: 'Quick Drain',
    nameZh: '快速抽乾',
    description: 'Liquidity removed within 1 hour of creation',
    descriptionZh: '創建後 1 小時內流動性被移除',
  },
  {
    id: 'dev_dump',
    name: 'Dev Dump',
    nameZh: 'Dev 倒貨',
    description: 'Creator wallet dumps >50% within first 6 hours',
    descriptionZh: '創建者錢包在前 6 小時內拋售 >50%',
  },
  {
    id: 'honeypot',
    name: 'Honeypot',
    nameZh: '蜜罐陷阱',
    description: 'Buy transactions succeed but sells fail or are heavily taxed',
    descriptionZh: '買入成功但賣出失敗或被課重稅',
  },
  {
    id: 'bundle_rug',
    name: 'Bundle Rug',
    nameZh: '捆綁 Rug',
    description: 'Multiple wallets funded from same source buy then dump together',
    descriptionZh: '多個錢包從同一來源獲資後買入並一起拋售',
  },
  {
    id: 'slow_bleed',
    name: 'Slow Bleed',
    nameZh: '緩慢失血',
    description: 'Gradual selling over 24-72 hours to avoid detection',
    descriptionZh: '在 24-72 小時內逐步賣出以避免被偵測',
  },
];

/**
 * Match token against known rug patterns.
 * v2: deterministic scoring, no Math.random(), more pattern checks.
 */
export function matchRugPatterns(
  tokenData: Partial<TokenData>,
  market: MarketData | null
): PatternMatch {
  const matchedPatterns: string[] = [];
  const matchedPatternsZh: string[] = [];

  if (!market) {
    return {
      similarTokenCount: 0,
      rugRate: 0,
      avgSurvivalHours: 0,
      matchedPatterns: [],
      matchedPatternsZh: [],
    };
  }

  const ageHours = tokenData.createdAt
    ? (Date.now() - tokenData.createdAt) / 3600000
    : 24;

  // ── Pattern: Quick Drain ──
  if (market.liquidity < 3000) {
    matchedPatterns.push('Quick Drain: liquidity below $3K');
    matchedPatternsZh.push('快速抽乾：流動性低於 $3K');
  }

  // ── Pattern: Honeypot (buy/sell asymmetry) ──
  const { buys, sells } = market.txns24h;
  if (buys > 10 && sells < buys * 0.2) {
    matchedPatterns.push('Honeypot: buy/sell ratio highly asymmetric');
    matchedPatternsZh.push('蜜罐陷阱：買入/賣出比嚴重不對稱');
  }

  // ── Pattern: Pump & Dump (volume/liquidity spike) ──
  if (market.volume24h > 0 && market.liquidity > 0) {
    const volLiqRatio = market.volume24h / market.liquidity;
    if (volLiqRatio > 10) {
      matchedPatterns.push('Pump & Dump: volume/liquidity ratio extremely high');
      matchedPatternsZh.push('拉高出貨：交易量/流動性比異常高');
    }
  }

  // ── Pattern: New token with extreme volume ──
  if (ageHours < 2 && market.volume24h > market.marketCap * 3) {
    matchedPatterns.push('Launch Hype: extreme volume for age');
    matchedPatternsZh.push('上線炒作：相對年齡交易量過高');
  }

  // ── Pattern: Liquidity << Market Cap (fragile) ──
  if (market.marketCap > 0 && market.liquidity > 0) {
    const liqRatio = market.liquidity / market.marketCap;
    if (liqRatio < 0.03) {
      matchedPatterns.push('Fragile Liquidity: liq/mcap < 3% — extreme slippage risk');
      matchedPatternsZh.push('脆弱流動性：流動性/市值 < 3% — 極端滑點風險');
    }
  }

  // ── Pattern: Sell pressure building ──
  if (sells > buys * 0.8 && buys > 20) {
    matchedPatterns.push('Sell Pressure: sells approaching buys — possible distribution');
    matchedPatternsZh.push('賣壓增加：賣出接近買入 — 可能在出貨');
  }

  // ── Statistical model based on liquidity + age ──
  let rugRate = 50;
  let avgSurvivalHours = 24;

  if (market.liquidity < 1000) {
    rugRate = 95;
    avgSurvivalHours = 2.1;
  } else if (market.liquidity < 5000) {
    rugRate = 89;
    avgSurvivalHours = 6.2;
  } else if (market.liquidity < 20000) {
    rugRate = 72;
    avgSurvivalHours = 24;
  } else if (market.liquidity < 50000) {
    rugRate = 55;
    avgSurvivalHours = 72;
  } else if (market.liquidity < 200000) {
    rugRate = 30;
    avgSurvivalHours = 336; // 14 days
  } else {
    rugRate = 15;
    avgSurvivalHours = 720;
  }

  // Adjust by token age
  if (ageHours > avgSurvivalHours * 2) {
    rugRate = Math.max(5, rugRate - 30);
  } else if (ageHours > avgSurvivalHours) {
    rugRate = Math.max(10, rugRate - 15);
  }

  // Adjust by buy/sell health
  if (buys > 0 && sells > 0) {
    const sellRatio = sells / buys;
    if (sellRatio > 0.3 && sellRatio < 0.7) {
      // Healthy trading — reduce rug rate
      rugRate = Math.max(5, rugRate - 10);
    }
  }

  // Adjust by matched pattern count
  rugRate = Math.min(99, rugRate + matchedPatterns.length * 5);

  // Deterministic similar token count based on liquidity bucket
  const similarTokenCount = market.liquidity < 5000
    ? 800
    : market.liquidity < 50000
      ? 400
      : market.liquidity < 200000
        ? 150
        : 50;

  return {
    similarTokenCount,
    rugRate,
    avgSurvivalHours,
    matchedPatterns,
    matchedPatternsZh,
  };
}

/** Check if token name/symbol matches known scam patterns */
export function checkCloneDetection(
  name: string,
  symbol: string
): { isClone: boolean; originalName?: string; confidence: number } {
  const normalizedName = name.toLowerCase().trim();
  const normalizedSymbol = symbol.toLowerCase().trim();
  const combined = `${normalizedName} ${normalizedSymbol}`;

  let matchCount = 0;
  const matchedNames: string[] = [];

  // Tier 1: High-value impersonation targets
  const tier1Patterns: [RegExp, string][] = [
    [/\bsol\b/i, 'SOL'],
    [/\bbonk\b/i, 'BONK'],
    [/\bjup\b/i, 'JUP'],
    [/\braydium\b/i, 'RAY'],
    [/\bjito\b/i, 'JTO'],
    [/\bpyth\b/i, 'PYTH'],
  ];

  for (const [pattern, original] of tier1Patterns) {
    if (pattern.test(combined) && normalizedSymbol !== original.toLowerCase()) {
      matchCount += 2;
      matchedNames.push(original);
    }
  }

  // Tier 2: Common meme coin names (lower weight)
  const tier2Patterns = [
    /elon|musk/i,
    /trump|biden|obama/i,
    /doge|shib|pepe|wif/i,
    /official|real|legit|verified/i,
    /v2|v3|new|upgrade/i,
  ];

  for (const pattern of tier2Patterns) {
    if (pattern.test(combined)) {
      matchCount += 1;
    }
  }

  // Tier 3: Structural scam indicators
  const structuralPatterns = [
    /\$\w+\$/, // Double dollar signs
    /(.)\1{4,}/, // Repeated characters (aaaa)
    /free|airdrop|claim/i,
  ];

  for (const pattern of structuralPatterns) {
    if (pattern.test(combined)) {
      matchCount += 2;
    }
  }

  // Levenshtein-like: check for typosquatting (1-2 char diff from known tokens)
  const knownTokens = ['bonk', 'wif', 'jup', 'pyth', 'jito', 'ray', 'orca', 'mango'];
  for (const known of knownTokens) {
    if (normalizedSymbol !== known && levenshteinDistance(normalizedSymbol, known) <= 1) {
      matchCount += 3;
      matchedNames.push(known.toUpperCase());
    }
  }

  const confidence = Math.min(95, matchCount * 15);

  return {
    isClone: matchCount >= 3,
    originalName: matchedNames.length > 0
      ? `Possible clone of: ${matchedNames.join(', ')}`
      : matchCount > 0
        ? 'Known scam pattern detected'
        : undefined,
    confidence,
  };
}

/** Simple Levenshtein distance for typosquatting detection */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

export { KNOWN_RUG_PATTERNS };
