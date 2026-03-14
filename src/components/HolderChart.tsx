'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { HolderDistribution } from '@/types';
import { shortenAddress } from '@/lib/utils';

interface HolderChartProps {
  holders: HolderDistribution;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#64748b'];

export function HolderChart({ holders }: HolderChartProps) {
  const chartData = holders.holders.slice(0, 10).map((h, i) => ({
    name: shortenAddress(h.address),
    value: parseFloat(h.percentage.toFixed(2)),
    fill: COLORS[i % COLORS.length],
  }));

  // Add "Others"
  const top10Pct = chartData.reduce((sum, d) => sum + d.value, 0);
  if (top10Pct < 100) {
    chartData.push({
      name: 'Others',
      value: parseFloat((100 - top10Pct).toFixed(2)),
      fill: '#374151',
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-2 text-sm font-medium text-white">
        🏦 持幣分佈 / Holder Distribution
      </h3>
      <div className="flex items-center gap-4">
        <div className="h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Holdings']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {chartData.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: d.fill }}
              />
              <span className="text-gray-400 font-mono truncate">{d.name}</span>
              <span className="ml-auto text-gray-300 tabular-nums">
                {d.value.toFixed(1)}%
              </span>
            </div>
          ))}
          {chartData.length > 5 && (
            <div className="text-xs text-gray-500">
              +{chartData.length - 5} more / 另有 {chartData.length - 5} 個
            </div>
          )}
          <div className="mt-2 border-t border-gray-700 pt-2 text-xs">
            <span className="text-gray-400">Top 10: </span>
            <span className="font-medium text-white tabular-nums">
              {holders.top10Percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
