// ═══════════════════════════════════════════════════════════
// RugShield — AI Bilingual Report Generator (OpenRouter)
// ═══════════════════════════════════════════════════════════

import type { AuditReport, AuditCheck, ForensicsReport, SimulationResult, PatternMatch } from '@/types';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

/** Generate bilingual AI report from audit data */
export async function generateAIReport(
  report: AuditReport
): Promise<{ verdict: string; verdictZh: string }> {
  if (!OPENROUTER_KEY || OPENROUTER_KEY === 'placeholder') {
    return generateLocalReport(report);
  }

  try {
    const prompt = buildPrompt(report);
    const res = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return parseBilingualResponse(text);
  } catch {
    return generateLocalReport(report);
  }
}

function buildPrompt(report: AuditReport): string {
  const checksSummary = report.checks
    .map((c) => `- ${c.name}: ${c.status} (score: ${c.score}/10) — ${c.details}`)
    .join('\n');

  return `You are a crypto security analyst. Analyze this token audit data and provide a bilingual (Traditional Chinese + English) verdict.

Token: ${report.token.name} (${report.token.symbol})
Address: ${report.token.address}
Overall Score: ${report.overallScore}/10
Risk Level: ${report.riskLevel}

Security Checks:
${checksSummary}

Creator Forensics:
- Tokens created: ${report.forensics.tokensCreated}
- Rug count: ${report.forensics.rugCount}
- Rug rate: ${report.forensics.rugRate.toFixed(1)}%
- Behavior: ${report.forensics.behaviorRating}

Pattern Analysis:
- Similar tokens: ${report.patterns.similarTokenCount}
- Historical rug rate: ${report.patterns.rugRate}%
- Avg survival: ${report.patterns.avgSurvivalHours}h

Format your response as:
VERDICT_ZH: [繁中一句話結論，50字內]
VERDICT_EN: [English one-line verdict, under 50 words]`;
}

function parseBilingualResponse(text: string): { verdict: string; verdictZh: string } {
  const zhMatch = text.match(/VERDICT_ZH:\s*(.+?)(?=\n|$)/);
  const enMatch = text.match(/VERDICT_EN:\s*(.+?)(?=\n|$)/);

  return {
    verdictZh: zhMatch?.[1]?.trim() || '',
    verdict: enMatch?.[1]?.trim() || '',
  };
}

/** Generate report without AI (local fallback) */
function generateLocalReport(report: AuditReport): { verdict: string; verdictZh: string } {
  const { overallScore, riskLevel, forensics, patterns } = report;

  if (riskLevel === 'extreme') {
    return {
      verdictZh: `此代幣極高風險，創建者有 ${forensics.rugCount} 次 rug 前科，建議避開`,
      verdict: `EXTREME RISK — Creator has ${forensics.rugCount} prior rug pulls, strongly advise avoiding`,
    };
  }

  if (riskLevel === 'high') {
    return {
      verdictZh: `此代幣高風險，安全評分 ${overallScore}/10，歷史 rug 率 ${patterns.rugRate.toFixed(0)}%，建議謹慎`,
      verdict: `HIGH RISK — Score ${overallScore}/10, historical rug rate ${patterns.rugRate.toFixed(0)}%, proceed with extreme caution`,
    };
  }

  if (riskLevel === 'medium') {
    return {
      verdictZh: `此代幣中等風險，安全評分 ${overallScore}/10，建議小額投入並設好止損`,
      verdict: `MODERATE RISK — Score ${overallScore}/10, consider small position with stop-loss`,
    };
  }

  return {
    verdictZh: `此代幣風險較低，安全評分 ${overallScore}/10，創建者背景相對乾淨`,
    verdict: `LOWER RISK — Score ${overallScore}/10, creator background relatively clean`,
  };
}

/** Format full audit report as bilingual text */
export function formatReportText(report: AuditReport): string {
  const lines: string[] = [];

  lines.push('⚡ 一句話結論 (One-line Verdict)');
  lines.push(`繁中: "${report.verdictZh}"`);
  lines.push(`English: "${report.verdict}"`);
  lines.push('');
  lines.push(`📊 安全評分: ${report.overallScore}/10 ${getRiskEmoji(report.riskLevel)} (信心度 ${report.confidence}%)`);
  lines.push('');

  // Checks
  lines.push('🔍 安全檢查 (Security Checks)');
  for (const check of report.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : check.status === 'fail' ? '❌' : 'ℹ️';
    lines.push(`${icon} ${check.nameZh} / ${check.name}: ${check.score}/10 — ${check.detailsZh}`);
  }
  lines.push('');

  // Forensics
  lines.push('🔍 創建者鑑識 (Creator Forensics)');
  lines.push(`- 歷史發幣: ${report.forensics.tokensCreated} 個`);
  lines.push(`- Rug 率: ${report.forensics.rugRate.toFixed(0)}% (${report.forensics.rugCount}/${report.forensics.tokensCreated})`);
  lines.push(`- 行為評級: ${report.forensics.behaviorRating}`);
  for (const src of report.forensics.fundingSources.slice(0, 3)) {
    lines.push(`- 資金來源: ${src.from.slice(0, 8)}... ← ${src.amount.toFixed(1)} ${src.token}${src.rugHistory ? ` ⚠️ (${src.rugHistory} rug 前科)` : ''}`);
  }
  lines.push('');

  // Simulation
  lines.push('📈 價格影響模擬 (Price Impact Simulation)');
  for (const impact of report.simulation.impacts) {
    lines.push(`- ${impact.scenarioZh} → 價格跌 ~${impact.priceDropPercent}%`);
  }
  lines.push('');

  // Patterns
  lines.push('📊 歷史比對 (Historical Pattern Match)');
  lines.push(`- 相似特徵代幣數量: ${report.patterns.similarTokenCount}`);
  lines.push(`- Rug 率: ${report.patterns.rugRate}%`);
  lines.push(`- 平均存活時間: ${report.patterns.avgSurvivalHours} 小時`);
  if (report.patterns.matchedPatternsZh.length > 0) {
    lines.push('- 匹配模式:');
    for (const p of report.patterns.matchedPatternsZh) {
      lines.push(`  • ${p}`);
    }
  }

  return lines.join('\n');
}

function getRiskEmoji(level: string): string {
  switch (level) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🟠';
    case 'extreme': return '🔴';
    default: return '⚪';
  }
}
