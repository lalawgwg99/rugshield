// ═══════════════════════════════════════════════════════════
// RugShield — Radar Alerts API Route
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import type { RadarAlert, RadarApiResponse } from '@/types';

// Mock radar alerts data
const MOCK_ALERTS: RadarAlert[] = [
  {
    id: 'alert-001',
    tokenAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
    tokenName: 'SolPepe',
    tokenSymbol: 'SPEPE',
    alertType: 'dev_movement',
    severity: 'critical',
    title: 'Dev Wallet Moving Tokens',
    titleZh: 'Dev 錢包正在轉移代幣',
    description: 'Creator wallet transferred 45% of token supply to a new wallet. Pattern matches known rug pull behavior.',
    descriptionZh: '創建者錢包將 45% 的代幣供應量轉移至新錢包。模式與已知 rug pull 行為相符。',
    suggestedAction: 'Sell immediately / Consider claiming insurance',
    suggestedActionZh: '立即賣出 / 考慮申請保險理賠',
    createdAt: Date.now() - 180000, // 3 min ago
    metadata: { transferAmount: '45%', toWallet: 'New wallet (5 transactions)' },
  },
  {
    id: 'alert-002',
    tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    tokenName: 'BonkCat',
    tokenSymbol: 'BCAT',
    alertType: 'liquidity_drain',
    severity: 'high',
    title: 'Liquidity Removal Detected',
    titleZh: '偵測到流動性移除',
    description: 'LP tokens have been moved from the liquidity pool. 60% of liquidity at risk.',
    descriptionZh: 'LP 代幣已從流動性池移出。60% 的流動性面臨風險。',
    suggestedAction: 'Monitor closely / Set stop-loss at -50%',
    suggestedActionZh: '密切關注 / 設定 -50% 止損',
    createdAt: Date.now() - 900000, // 15 min ago
    metadata: { lpMoved: '60%' },
  },
  {
    id: 'alert-003',
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenName: 'TrumpFrog',
    tokenSymbol: 'TFROG',
    alertType: 'insider_selling',
    severity: 'high',
    title: 'Insider Wallets Selling',
    titleZh: '內部錢包開始賣出',
    description: '3 wallets funded from the same source are systematically selling. Combined 25% of supply sold in 30 minutes.',
    descriptionZh: '3 個從同一來源獲資的錢包正在系統性賣出。30 分鐘內合計賣出 25% 供應量。',
    suggestedAction: 'Consider reducing position size',
    suggestedActionZh: '考慮減倉',
    createdAt: Date.now() - 2400000, // 40 min ago
    metadata: { wallets: 3, soldPercent: '25%', timeframe: '30min' },
  },
  {
    id: 'alert-004',
    tokenAddress: 'So11111111111111111111111111111111111111112',
    tokenName: 'DogeMoon',
    tokenSymbol: 'DMOON',
    alertType: 'coordinated_promo',
    severity: 'medium',
    title: 'Coordinated Promotion Detected',
    titleZh: '偵測到協調推廣活動',
    description: 'Unusual Twitter activity spike. 50+ accounts posting identical content about this token within 1 hour.',
    descriptionZh: 'Twitter 異常活動暴增。50+ 帳號在 1 小時內發布相同內容。',
    suggestedAction: 'Do your own research / Beware of paid promotions',
    suggestedActionZh: '自行研究 / 警惕付費推廣',
    createdAt: Date.now() - 5400000, // 90 min ago
    metadata: { accounts: 50, platform: 'Twitter' },
  },
  {
    id: 'alert-005',
    tokenAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    tokenName: 'SafePepe',
    tokenSymbol: 'SPEPE',
    alertType: 'whale_dump',
    severity: 'medium',
    title: 'Whale Wallet Selling Pressure',
    titleZh: '大戶賣壓增加',
    description: 'Top 3 holders have sold 15% combined in the last hour. No dev involvement detected yet.',
    descriptionZh: '前 3 大持幣者在過去 1 小時內合計賣出 15%。尚未偵測到 Dev 參與。',
    suggestedAction: 'Monitor top holder activity',
    suggestedActionZh: '監控大戶持幣動向',
    createdAt: Date.now() - 7200000, // 2 hours ago
    metadata: { topHoldersSold: '15%', timeframe: '1h' },
  },
  {
    id: 'alert-006',
    tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    tokenName: 'CatWifHat',
    tokenSymbol: 'CWH',
    alertType: 'honeypot_detected',
    severity: 'critical',
    title: 'Honeypot Pattern Detected',
    titleZh: '偵測到蜜罐模式',
    description: 'Sell transactions are failing for 78% of wallets. Only creator-affiliated wallets can sell successfully.',
    descriptionZh: '78% 的錢包賣出交易失敗。只有創建者關聯錢包能成功賣出。',
    suggestedAction: 'DO NOT BUY / Avoid this token completely',
    suggestedActionZh: '請勿買入 / 完全避開此代幣',
    createdAt: Date.now() - 600000, // 10 min ago
    metadata: { sellFailRate: '78%' },
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let alerts = [...MOCK_ALERTS];

    // Filter by severity
    if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    // Sort by creation time (newest first)
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    alerts = alerts.slice(0, limit);

    return NextResponse.json<RadarApiResponse>({
      success: true,
      alerts,
      subscribed: false, // Would check actual subscription status in production
    });
  } catch (error) {
    console.error('Radar API error:', error);
    return NextResponse.json<RadarApiResponse>(
      {
        success: false,
        alerts: [],
        subscribed: false,
      },
      { status: 500 }
    );
  }
}
