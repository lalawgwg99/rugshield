'use client';

import { cn } from '@/lib/utils';

interface LifecycleBarProps {
  stage: string;
  stageZh: string;
  progress: number; // 0-100
  bondingCurveProgress?: number;
}

const STAGES = [
  { key: 'just_created', label: 'Created', labelZh: '創建', threshold: 0 },
  { key: 'early', label: 'Early', labelZh: '早期', threshold: 15 },
  { key: 'growing', label: 'Growing', labelZh: '成長', threshold: 35 },
  { key: 'bonding', label: 'Bonding', labelZh: '綁定', threshold: 60 },
  { key: 'migrated', label: 'Migrated', labelZh: '遷移', threshold: 100 },
];

export function LifecycleBar({
  stage,
  stageZh,
  progress,
  bondingCurveProgress,
}: LifecycleBarProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-3 text-sm font-medium text-white">
        🏗️ 生命週期 / Lifecycle
      </h3>

      {/* Progress bar */}
      <div className="relative h-3 rounded-full bg-gray-800 mb-3">
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-full transition-all',
            progress < 30
              ? 'bg-red-500'
              : progress < 60
              ? 'bg-yellow-500'
              : 'bg-green-500'
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        {/* Stage markers */}
        {STAGES.map((s) => (
          <div
            key={s.key}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-4 w-0.5',
              progress >= s.threshold ? 'bg-white/50' : 'bg-gray-600'
            )}
            style={{ left: `${s.threshold}%` }}
          />
        ))}
      </div>

      {/* Stage labels */}
      <div className="flex justify-between text-xs">
        {STAGES.map((s) => (
          <span
            key={s.key}
            className={cn(
              stage === s.key ? 'text-cyan-400 font-medium' : 'text-gray-500'
            )}
          >
            {s.labelZh}
          </span>
        ))}
      </div>

      {/* Current stage */}
      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-sm text-white">{stageZh}</span>
          <span className="text-xs text-gray-500 ml-1">/ {stage}</span>
        </div>
        <span className="text-sm tabular-nums text-gray-400">
          {progress}%
          {bondingCurveProgress !== undefined && (
            <span className="text-xs text-gray-500 ml-1">
              (Bonding: {bondingCurveProgress}%)
            </span>
          )}
        </span>
      </div>

      {/* Risk warning for early stages */}
      {progress < 30 && (
        <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2">
          <p className="text-xs text-red-400">
            ⚠️ 極高風險階段 / Extremely risky stage — 大部分 rug 在此階段發生
          </p>
        </div>
      )}
    </div>
  );
}
