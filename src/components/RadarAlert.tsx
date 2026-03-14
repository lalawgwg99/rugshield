'use client';

import type { RadarAlert as RadarAlertType } from '@/types';
import { shortenAddress, timeAgo } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface RadarAlertProps {
  alert: RadarAlertType;
}

const SEVERITY_CONFIG = {
  low: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  critical: {
    icon: AlertOctagon,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
};

export function RadarAlertCard({ alert }: RadarAlertProps) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border ${config.bg} cursor-pointer transition-all`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.color}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-white truncate">
                {alert.titleZh}
              </h4>
              <span className="text-xs text-gray-500 shrink-0">
                {timeAgo(alert.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`text-xs font-medium ${config.color}`}>
                {alert.severity.toUpperCase()}
              </span>
              <span className="text-xs text-gray-400">
                ${alert.tokenSymbol} • {shortenAddress(alert.tokenAddress)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">
              {alert.descriptionZh}
            </p>
          </div>
          <ChevronRight
            className={`h-4 w-4 text-gray-600 shrink-0 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
            <div>
              <div className="text-xs font-medium text-gray-300">
                說明 / Details
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {alert.descriptionZh}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {alert.description}
              </p>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-300">
                建議操作 / Suggested Action
              </div>
              <p className="text-xs text-cyan-400 mt-0.5">
                {alert.suggestedActionZh}
              </p>
            </div>
            <a
              href={`/audit?token=${alert.tokenAddress}`}
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              查看完整審計 / View Full Audit
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
