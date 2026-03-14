// ═══════════════════════════════════════════════════════════
// RugShield — Audit API Route
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import type { AuditReport, AuditApiResponse, TokenData, TimelineEvent } from '@/types';
import { runAuditChecks, calculateOverallScore } from '@/lib/audit/analyzer';
import { getMarketData } from '@/lib/audit/dexscreener';
import { getTokenBasicInfo, getTokenLargestAccounts } from '@/lib/audit/solana';
import { analyzeCreatorWallet } from '@/lib/audit/forensics';
import { simulatePriceImpact } from '@/lib/audit/simulation';
import { matchRugPatterns, checkCloneDetection } from '@/lib/audit/patterns';
import { generateAIReport } from '@/lib/audit/report';
import { getRiskLevel, isValidSolanaAddress } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('token');

    if (!tokenAddress) {
      return NextResponse.json<AuditApiResponse>(
        { success: false, error: 'Missing token address / 缺少代幣地址' },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(tokenAddress)) {
      return NextResponse.json<AuditApiResponse>(
        { success: false, error: 'Invalid Solana address / 無效的 Solana 地址' },
        { status: 400 }
      );
    }

    // Fetch all data in parallel
    const [tokenInfo, marketData, largestAccounts] = await Promise.all([
      getTokenBasicInfo(tokenAddress),
      getMarketData(tokenAddress),
      getTokenLargestAccounts(tokenAddress),
    ]);

    // Build token data
    const tokenData: TokenData = {
      address: tokenAddress,
      name: marketData ? `Token (${tokenAddress.slice(0, 4)}...)` : 'Unknown Token',
      symbol: marketData ? tokenAddress.slice(0, 4).toUpperCase() : '???',
      decimals: tokenInfo?.decimals || 9,
      supply: tokenInfo?.supply || '0',
      createdAt: tokenInfo?.createdAt,
    };

    // Build holder distribution
    const holderDistribution = largestAccounts.length > 0
      ? {
          totalHolders: largestAccounts.length,
          top10Percentage: largestAccounts.reduce((sum, h) => sum + h.percentage, 0),
          topHolderPct: largestAccounts[0]?.percentage || 0,
          devHoldings: largestAccounts[0]?.percentage || 0,
          holders: largestAccounts,
        }
      : null;

    // Run security checks
    const checks = await runAuditChecks({
      tokenAddress,
      tokenData,
      marketData,
      holders: holderDistribution,
    });

    const overallScore = calculateOverallScore(checks);
    const riskLevel = getRiskLevel(overallScore);

    // Run forensics
    const creatorAddress = largestAccounts[0]?.address || tokenAddress;
    const forensics = await analyzeCreatorWallet(creatorAddress, tokenAddress);

    // Run simulations
    const simulation = simulatePriceImpact(holderDistribution, marketData);

    // Pattern matching
    const patterns = matchRugPatterns(tokenData, marketData);
    const cloneCheck = checkCloneDetection(tokenData.name, tokenData.symbol);

    // Build timeline
    const timeline: TimelineEvent[] = [];
    if (tokenData.createdAt) {
      const ageH = (Date.now() - tokenData.createdAt) / 3600000;
      timeline.push({
        time: 'T+0',
        description: 'Token created on-chain',
        descriptionZh: '代幣上鏈創建',
        severity: 'info',
      });
      if (ageH > 0.03) {
        timeline.push({
          time: 'T+2min',
          description: 'Liquidity pool initialized',
          descriptionZh: '流動性池初始化',
          severity: 'info',
        });
      }
      if (ageH > 1) {
        timeline.push({
          time: 'T+1h',
          description: 'Monitoring for suspicious transfers',
          descriptionZh: '監控可疑轉移中',
          severity: marketData && marketData.liquidity < 5000 ? 'warn' : 'info',
        });
      }
    }

    // Generate AI verdict
    const tempReport: AuditReport = {
      token: tokenData,
      market: marketData,
      holders: holderDistribution,
      overallScore,
      riskLevel,
      confidence: 85,
      checks,
      verdict: '',
      verdictZh: '',
      forensics,
      simulation,
      patterns,
      timeline,
      createdAt: Date.now(),
    };

    const { verdict, verdictZh } = await generateAIReport(tempReport);
    tempReport.verdict = verdict || `Risk score ${overallScore}/10 (${riskLevel})`;
    tempReport.verdictZh = verdictZh || `風險評分 ${overallScore}/10 (${riskLevel})`;

    return NextResponse.json<AuditApiResponse>({
      success: true,
      report: tempReport,
    });
  } catch (error) {
    console.error('Audit error:', error);
    return NextResponse.json<AuditApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Audit failed / 審計失敗',
      },
      { status: 500 }
    );
  }
}
