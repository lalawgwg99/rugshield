'use client';

import { getRiskLevel, getRiskColor, getRiskBgColor, getRiskEmoji } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface RiskBadgeProps {
  score: number;
  level?: RiskLevel;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function RiskBadge({
  score,
  level: levelProp,
  confidence,
  size = 'md',
  showDetails = true,
}: RiskBadgeProps) {
  const level = levelProp || getRiskLevel(score);
  const emoji = getRiskEmoji(level);
  const colorClass = getRiskColor(level);
  const bgClass = getRiskBgColor(level);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2',
  };

  const scoreSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border ${bgClass} ${sizeClasses[size]}`}>
      <span className={scoreSizes[size]}>{emoji}</span>
      <div>
        <div className={`font-bold tabular-nums ${colorClass}`}>
          {score}/10
        </div>
        {showDetails && (
          <div className="text-xs text-gray-400">
            {level === 'low' ? 'Low Risk / 低風險' :
             level === 'medium' ? 'Medium Risk / 中風險' :
             level === 'high' ? 'High Risk / 高風險' :
             'Extreme Risk / 極高風險'}
            {confidence !== undefined && ` • ${confidence}% confidence`}
          </div>
        )}
      </div>
    </div>
  );
}
