// ═══════════════════════════════════════════════════════════
// RugShield — Utility Functions
// ═══════════════════════════════════════════════════════════

import type { RiskLevel } from '@/types';

/** Tailwind CSS class merge helper */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Shorten Solana address for display */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Format number with commas */
export function formatNumber(num: number, decimals = 2): string {
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format USD price */
export function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

/** Format percentage */
export function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Get risk level from score */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 7) return 'low';
  if (score >= 4) return 'medium';
  if (score >= 2) return 'high';
  return 'extreme';
}

/** Get risk color class */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'high': return 'text-orange-500';
    case 'extreme': return 'text-red-500';
  }
}

/** Get risk emoji */
export function getRiskEmoji(level: RiskLevel): string {
  switch (level) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🟠';
    case 'extreme': return '🔴';
  }
}

/** Get risk bg color class */
export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'bg-green-500/10 border-green-500/30';
    case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'high': return 'bg-orange-500/10 border-orange-500/30';
    case 'extreme': return 'bg-red-500/10 border-red-500/30';
  }
}

/** Format timestamp to relative time */
export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Validate Solana address format */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
