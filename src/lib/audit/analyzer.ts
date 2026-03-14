// ═══════════════════════════════════════════════════════════
// RugShield — Risk Analyzer (12 Security Checks)
// ═══════════════════════════════════════════════════════════

import type { AuditCheck, TokenData, MarketData, HolderDistribution } from '@/types';
import {
  getTokenSupply,
  getTokenLargestAccounts,
  checkFreezeAuthority,
  checkMintAuthority,
} from './solana';
import { getMarketData } from './dexscreener';

interface AnalyzerInput {
  tokenAddress: string;
  tokenData?: Partial<TokenData>;
  marketData?: MarketData | null;
  holders?: HolderDistribution | null;
}

/** Run all 12 security checks */
export async function runAuditChecks(input: AnalyzerInput): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const { tokenAddress } = input;

  // Fetch data in parallel
  const [market, freezeAuth, mintAuth, supply] = await Promise.all([
    input.marketData !== undefined ? input.marketData : getMarketData(tokenAddress),
    checkFreezeAuthority(tokenAddress),
    checkMintAuthority(tokenAddress),
    getTokenSupply(tokenAddress),
  ]);

  const largestAccounts = await getTokenLargestAccounts(tokenAddress, supply?.amount);

  const holders = largestAccounts;

  // ── 1. Holder Concentration ──
  const top10Pct = holders.reduce((sum, h) => sum + h.percentage, 0);
  checks.push({
    id: 'holder_concentration',
    name: 'Holder Concentration',
    nameZh: '持幣集中度',
    status: top10Pct > 80 ? 'fail' : top10Pct > 50 ? 'warn' : 'pass',
    score: top10Pct > 80 ? 1 : top10Pct > 50 ? 4 : 8,
    details: `Top 10 wallets hold ${top10Pct.toFixed(1)}% of supply`,
    detailsZh: `前 10 大錢包持有 ${top10Pct.toFixed(1)}% 的代幣總量`,
  });

  // ── 2. Liquidity Status ──
  const liq = market?.liquidity || 0;
  checks.push({
    id: 'liquidity_status',
    name: 'Liquidity Status',
    nameZh: '流動性狀態',
    status: liq < 5000 ? 'fail' : liq < 50000 ? 'warn' : 'pass',
    score: liq < 1000 ? 1 : liq < 5000 ? 3 : liq < 50000 ? 5 : 8,
    details: `Liquidity: $${liq.toLocaleString()}`,
    detailsZh: `流動性: $${liq.toLocaleString()}`,
  });

  // ── 3. Volume Analysis (Wash Trading Detection) ──
  const volume = market?.volume24h || 0;
  const mcap = market?.marketCap || 1;
  const volMcapRatio = mcap > 0 ? volume / mcap : 0;
  // Fixed: check > 10 first (was reversed — > 5 matched before > 10 could)
  checks.push({
    id: 'volume_analysis',
    name: 'Volume Analysis',
    nameZh: '交易量分析',
    status: volMcapRatio > 10 ? 'fail' : volMcapRatio > 5 ? 'warn' : 'pass',
    score: volMcapRatio > 10 ? 2 : volMcapRatio > 5 ? 5 : 8,
    details: `Volume/MCap ratio: ${volMcapRatio.toFixed(2)}x${volMcapRatio > 5 ? ' (possible wash trading)' : ''}`,
    detailsZh: `交易量/市值比: ${volMcapRatio.toFixed(2)}x${volMcapRatio > 5 ? '（可能為刷量交易）' : ''}`,
  });

  // ── 4. Token Age ──
  const ageMs = input.tokenData?.createdAt
    ? Date.now() - input.tokenData.createdAt
    : undefined;
  const ageHours = ageMs ? ageMs / (1000 * 3600) : undefined;
  checks.push({
    id: 'token_age',
    name: 'Token Age',
    nameZh: '代幣年齡',
    status: ageHours !== undefined && ageHours < 1 ? 'fail' : ageHours !== undefined && ageHours < 24 ? 'warn' : 'pass',
    score: ageHours === undefined ? 5 : ageHours < 1 ? 1 : ageHours < 6 ? 2 : ageHours < 24 ? 4 : ageHours < 168 ? 6 : 8,
    details: ageHours !== undefined ? `Created ${ageHours.toFixed(1)} hours ago` : 'Creation time unknown',
    detailsZh: ageHours !== undefined ? `創建於 ${ageHours.toFixed(1)} 小時前` : '創建時間未知',
  });

  // ── 5. Social Presence ──
  const socials = input.tokenData?.socials;
  const socialCount = [socials?.twitter, socials?.telegram, socials?.website].filter(Boolean).length;
  checks.push({
    id: 'social_presence',
    name: 'Social Presence',
    nameZh: '社群存在',
    status: socialCount === 0 ? 'fail' : socialCount === 1 ? 'warn' : 'pass',
    score: socialCount === 0 ? 2 : socialCount === 1 ? 5 : socialCount === 2 ? 7 : 9,
    details: `${socialCount}/3 social links found`,
    detailsZh: `找到 ${socialCount}/3 個社群連結`,
  });

  // ── 6. Freeze Authority ──
  checks.push({
    id: 'freeze_authority',
    name: 'Freeze Authority',
    nameZh: '凍結權限',
    status: freezeAuth ? 'fail' : 'pass',
    score: freezeAuth ? 1 : 9,
    details: freezeAuth
      ? 'Freeze authority is ACTIVE — tokens can be frozen'
      : 'Freeze authority is revoked — tokens cannot be frozen',
    detailsZh: freezeAuth
      ? '凍結權限啟用中 — 代幣可被凍結'
      : '凍結權限已撤銷 — 代幣無法被凍結',
  });

  // ── 7. Mint Authority ──
  checks.push({
    id: 'mint_authority',
    name: 'Mint Authority',
    nameZh: '鑄造權限',
    status: mintAuth ? 'fail' : 'pass',
    score: mintAuth ? 1 : 9,
    details: mintAuth
      ? 'Mint authority is ACTIVE — more tokens can be minted'
      : 'Mint authority is revoked — supply is fixed',
    detailsZh: mintAuth
      ? '鑄造權限啟用中 — 可增發代幣'
      : '鑄造權限已撤銷 — 供應量固定',
  });

  // ── 8. Metadata Mutability ──
  // SPL token metadata can be mutable; check if update authority is set
  checks.push({
    id: 'metadata_mutability',
    name: 'Metadata Mutability',
    nameZh: 'Metadata 可變性',
    status: 'warn',
    score: 5,
    details: 'Metadata mutability check requires Metaplex program analysis',
    detailsZh: 'Metadata 可變性檢查需要分析 Metaplex 程式',
  });

  // ── 9. Honeypot Detection ──
  const buys = market?.txns24h.buys || 0;
  const sells = market?.txns24h.sells || 0;
  const buySellRatio = sells > 0 ? buys / sells : buys > 0 ? 99 : 1;
  checks.push({
    id: 'honeypot_check',
    name: 'Honeypot Detection',
    nameZh: '蜜罐偵測',
    status: buySellRatio > 5 ? 'fail' : buySellRatio > 3 ? 'warn' : 'pass',
    score: buySellRatio > 5 ? 1 : buySellRatio > 3 ? 3 : 7,
    details: `Buy/Sell ratio: ${buySellRatio.toFixed(1)}x (buys: ${buys}, sells: ${sells})`,
    detailsZh: `買入/賣出比: ${buySellRatio.toFixed(1)}x（買入: ${buys}, 賣出: ${sells}）`,
  });

  // ── 10. Creator Forensics (placeholder, detailed in forensics.ts) ──
  checks.push({
    id: 'creator_forensics',
    name: 'Creator Forensics',
    nameZh: '創建者鑑識',
    status: 'info',
    score: 5,
    details: 'Full forensic analysis available in detailed report',
    detailsZh: '完整鑑識分析請查看詳細報告',
  });

  // ── 11. Clone Detection (placeholder, detailed in patterns.ts) ──
  checks.push({
    id: 'clone_detection',
    name: 'Clone Detection',
    nameZh: '克隆偵測',
    status: 'info',
    score: 5,
    details: 'Clone/meme pattern analysis available in detailed report',
    detailsZh: '克隆/迷因模式分析請查看詳細報告',
  });

  // ── 12. Insider Tracking (placeholder, detailed in forensics.ts) ──
  checks.push({
    id: 'insider_tracking',
    name: 'Insider Tracking',
    nameZh: '內部人追蹤',
    status: 'info',
    score: 5,
    details: 'Insider wallet tracking available in detailed report',
    detailsZh: '內部錢包追蹤請查看詳細報告',
  });

  return checks;
}

/** Calculate overall score from checks */
export function calculateOverallScore(checks: AuditCheck[]): number {
  const scored = checks.filter((c) => c.status !== 'info');
  if (scored.length === 0) return 5;
  return Math.round(scored.reduce((sum, c) => sum + c.score, 0) / scored.length);
}
