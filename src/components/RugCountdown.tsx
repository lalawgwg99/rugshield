'use client';

import { cn } from '@/lib/utils';

interface RugCountdownProps {
  ageHours: number;
  avgSurvivalHours: number;
  rugRate: number;
}

export function RugCountdown({
  ageHours,
  avgSurvivalHours,
  rugRate,
}: RugCountdownProps) {
  const remainingHours = Math.max(0, avgSurvivalHours - ageHours);
  const elapsed = avgSurvivalHours > 0
    ? Math.min(100, (ageHours / avgSurvivalHours) * 100)
    : 0;

  const riskLevel =
    elapsed > 80
      ? { color: 'text-green-400', bg: 'bg-green-500', label: 'Surviving', labelZh: '存活中' }
      : elapsed > 50
      ? { color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'Caution', labelZh: '謹慎' }
      : { color: 'text-red-400', bg: 'bg-red-500', label: 'Danger Zone', labelZh: '危險區域' };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-3 text-sm font-medium text-white">
        ⏰ Rug 風險計時 / Rug Risk Timer
      </h3>

      {/* Timer bar */}
      <div className="relative h-3 rounded-full bg-gray-800 mb-3">
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-full transition-all',
            riskLevel.bg
          )}
          style={{ width: `${elapsed}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-white tabular-nums">
            {ageHours.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500">已存活 / Age</div>
        </div>
        <div className="text-center">
          <div className={cn('text-lg font-bold tabular-nums', riskLevel.color)}>
            {remainingHours.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500">預估剩餘 / Est. Remaining</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-400 tabular-nums">
            {rugRate.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Rug 機率 / Rug Rate</div>
        </div>
      </div>

      {/* Status */}
      <div
        className={cn(
          'mt-3 rounded-lg p-2 text-center text-xs font-medium',
          elapsed > 80
            ? 'bg-green-500/10 text-green-400'
            : elapsed > 50
            ? 'bg-yellow-500/10 text-yellow-400'
            : 'bg-red-500/10 text-red-400'
        )}
      >
        {riskLevel.labelZh} / {riskLevel.label}
        {remainingHours > 0 && remainingHours < 2 && (
          <span className="ml-1">— ⚠️ 高風險窗口</span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        基於相似特徵代幣的平均存活時間
        <br />
        Based on average survival time of similar tokens
      </p>
    </div>
  );
}
