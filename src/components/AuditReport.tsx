'use client';

import type { AuditReport as AuditReportType } from '@/types';
import { RiskBadge } from './RiskBadge';
import { PriceChart } from './PriceChart';
import { HolderChart } from './HolderChart';
import { MoneyFlow } from './MoneyFlow';
import { LifecycleBar } from './LifecycleBar';
import { RugCountdown } from './RugCountdown';
import { InsurancePanel } from './InsurancePanel';
import { shortenAddress, timeAgo } from '@/lib/utils';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

interface AuditReportProps {
  report: AuditReportType;
}

export function AuditReport({ report }: AuditReportProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(report.token.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Verdict Header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {report.token.name}
              <span className="ml-2 text-gray-400">${report.token.symbol}</span>
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <code className="text-sm text-gray-400 font-mono">
                {shortenAddress(report.token.address, 6)}
              </code>
              <button onClick={copyAddress} className="text-gray-500 hover:text-gray-300">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`https://solscan.io/token/${report.token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-cyan-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {copied && <span className="text-xs text-cyan-400">Copied!</span>}
            </div>
          </div>
          <RiskBadge
            score={report.overallScore}
            level={report.riskLevel}
            confidence={report.confidence}
            size="lg"
          />
        </div>

        {/* Verdict */}
        <div className="mt-4 space-y-2">
          <p className="text-base font-medium text-white">
            ⚡ {report.verdictZh}
          </p>
          <p className="text-sm text-gray-400">
            ⚡ {report.verdict}
          </p>
        </div>
      </div>

      {/* Security Checks Grid */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          🔍 安全檢查 Security Checks
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {report.checks.map((check) => (
            <div
              key={check.id}
              className="rounded-lg border border-gray-800 bg-gray-950 p-3"
            >
              <div className="flex items-start gap-2">
                {check.status === 'pass' && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
                )}
                {check.status === 'warn' && (
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500 shrink-0" />
                )}
                {check.status === 'fail' && (
                  <XCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
                )}
                {check.status === 'info' && (
                  <Info className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {check.nameZh}
                    </span>
                    <span className="text-xs tabular-nums text-gray-400 shrink-0">
                      {check.score}/10
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{check.detailsZh}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Creator Forensics */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          🔬 創建者鑑識 Creator Forensics
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-950 p-4 text-center">
            <div className="text-2xl font-bold text-white tabular-nums">
              {report.forensics.tokensCreated}
            </div>
            <div className="text-xs text-gray-400">歷史發幣 / Tokens Created</div>
          </div>
          <div className="rounded-lg bg-gray-950 p-4 text-center">
            <div className="text-2xl font-bold text-red-400 tabular-nums">
              {report.forensics.rugCount}
            </div>
            <div className="text-xs text-gray-400">Rug 次數 / Rug Count</div>
          </div>
          <div className="rounded-lg bg-gray-950 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 tabular-nums">
              {report.forensics.rugRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Rug 率 / Rug Rate</div>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-gray-950 p-3">
          <div className="text-sm font-medium text-white">
            行為評級: {report.forensics.behaviorRating}
          </div>
          <div className="text-xs text-gray-400">
            Behavior: {report.forensics.behaviorRating}
          </div>
        </div>
        {report.forensics.fundingSources.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-white mb-2">
              資金來源 / Funding Sources
            </div>
            {report.forensics.fundingSources.map((src, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-gray-400 py-1 font-mono"
              >
                <span className="text-gray-500">←</span>
                <span>{shortenAddress(src.from, 6)}</span>
                <span className="text-cyan-400">
                  {src.amount.toFixed(1)} {src.token}
                </span>
                {src.rugHistory ? (
                  <span className="text-red-400">⚠️ {src.rugHistory} rug</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Money Flow */}
      {report.forensics.fundingSources.length > 0 && (
        <MoneyFlow
          creatorAddress={report.forensics.creatorAddress}
          fundingSources={report.forensics.fundingSources}
          associatedWallets={report.forensics.associatedWallets}
        />
      )}

      {/* Price Impact Simulation */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          📈 價格影響模擬 Price Impact Simulation
        </h3>
        <div className="space-y-3">
          {report.simulation.impacts.map((impact, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-gray-950 p-3"
            >
              <div>
                <div className="text-sm text-white">{impact.scenarioZh}</div>
                <div className="text-xs text-gray-500">{impact.scenario}</div>
              </div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  impact.priceDropPercent > 80
                    ? 'text-red-500'
                    : impact.priceDropPercent > 50
                    ? 'text-orange-500'
                    : 'text-yellow-500'
                }`}
              >
                -{impact.priceDropPercent}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Pattern Match */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          📊 歷史比對 Historical Pattern Match
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-950 p-4 text-center">
            <div className="text-2xl font-bold text-white tabular-nums">
              {report.patterns.similarTokenCount}
            </div>
            <div className="text-xs text-gray-400">相似代幣 / Similar Tokens</div>
          </div>
          <div className="rounded-lg bg-gray-950 p-4 text-center">
            <div className="text-2xl font-bold text-red-400 tabular-nums">
              {report.patterns.rugRate}%
            </div>
            <div className="text-xs text-gray-400">歷史 Rug 率 / Historical Rug Rate</div>
          </div>
          <div className="rounded-lg bg-gray-950 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 tabular-nums">
              {report.patterns.avgSurvivalHours.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-400">平均存活 / Avg Survival</div>
          </div>
        </div>
        {report.patterns.matchedPatternsZh.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-white mb-1">
              匹配模式 / Matched Patterns
            </div>
            {report.patterns.matchedPatternsZh.map((p, i) => (
              <div key={i} className="text-xs text-gray-400 py-0.5">
                • {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lifecycle & Rug Countdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <LifecycleBar
          stage="early"
          stageZh="早期階段"
          progress={15}
        />
        <RugCountdown
          ageHours={
            report.token.createdAt
              ? (Date.now() - report.token.createdAt) / 3600000
              : 0
          }
          avgSurvivalHours={report.patterns.avgSurvivalHours}
          rugRate={report.patterns.rugRate}
        />
      </div>

      {/* Price Chart & Holder Distribution */}
      {report.market && report.holders && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceChart
            data={report.market.priceHistory || []}
            symbol={report.token.symbol}
          />
          <HolderChart holders={report.holders} />
        </div>
      )}

      {/* Insurance Panel */}
      <InsurancePanel
        tokenAddress={report.token.address}
        tokenSymbol={report.token.symbol}
        riskScore={report.overallScore}
      />

      {/* Timeline */}
      {report.timeline.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            ⏰ 風險時間線 Risk Timeline
          </h3>
          <div className="space-y-3">
            {report.timeline.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      event.severity === 'danger'
                        ? 'bg-red-500'
                        : event.severity === 'warn'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  {i < report.timeline.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-700" />
                  )}
                </div>
                <div className="pb-4">
                  <div className="text-xs text-gray-500">{event.time}</div>
                  <div className="text-sm text-white">{event.descriptionZh}</div>
                  <div className="text-xs text-gray-500">{event.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
