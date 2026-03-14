// ═══════════════════════════════════════════════════════════
// RugShield — DexScreener API Client
// ═══════════════════════════════════════════════════════════

import type { MarketData, PricePoint } from '@/types';

const DEX_API = 'https://api.dexscreener.com/latest/dex';

interface DexPair {
  pairAddress: string;
  dexId: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceChange: {
    h24: number;
  };
  volume: {
    h24: number;
  };
  marketCap: number;
  liquidity: {
    usd: number;
  };
  txns: {
    h24: {
      buys: number;
      sells: number;
    };
  };
  pairCreatedAt?: number;
}

interface DexResponse {
  pairs: DexPair[] | null;
}

/** Fetch market data from DexScreener for a Solana token */
export async function getMarketData(
  tokenAddress: string
): Promise<MarketData | null> {
  try {
    const res = await fetch(`${DEX_API}/tokens/${tokenAddress}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) return null;
    const data: DexResponse = await res.json();

    if (!data.pairs || data.pairs.length === 0) return null;

    // Use the pair with highest liquidity
    const pair = data.pairs.sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    return {
      priceUsd: parseFloat(pair.priceUsd) || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      volume24h: pair.volume?.h24 || 0,
      marketCap: pair.marketCap || 0,
      liquidity: pair.liquidity?.usd || 0,
      liquidityLocked: false, // DexScreener doesn't directly provide this
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      txns24h: {
        buys: pair.txns?.h24?.buys || 0,
        sells: pair.txns?.h24?.sells || 0,
      },
      priceHistory: [], // Would need separate chart API
    };
  } catch {
    return null;
  }
}

/** Fetch price chart data points (using pair chart endpoint) */
export async function getPriceHistory(
  _tokenAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _hours = 24
): Promise<PricePoint[]> {
  // DexScreener free API does not provide granular chart data.
  // Returning empty array instead of simulated mock data.
  return [];
}

/** Search for a token by name or symbol */
export async function searchToken(query: string): Promise<
  Array<{
    address: string;
    name: string;
    symbol: string;
    priceUsd: number;
    marketCap: number;
  }>
> {
  try {
    const res = await fetch(`${DEX_API}/search?q=${encodeURIComponent(query)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data: DexResponse = await res.json();
    if (!data.pairs) return [];

    return data.pairs
      .filter((p) => p.baseToken)
      .map((p) => ({
        address: p.baseToken.address,
        name: p.baseToken.name,
        symbol: p.baseToken.symbol,
        priceUsd: parseFloat(p.priceUsd) || 0,
        marketCap: p.marketCap || 0,
      }))
      .slice(0, 10);
  } catch {
    return [];
  }
}
