'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { PricePoint } from '@/types';
import { formatPrice } from '@/lib/utils';

interface PriceChartProps {
  data: PricePoint[];
  symbol: string;
}

export function PriceChart({ data, symbol }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-2 text-sm font-medium text-white">
          📈 價格走勢 / Price Chart
        </h3>
        <div className="flex h-48 items-center justify-center text-gray-500 text-sm">
          No price data available / 無價格資料
        </div>
      </div>
    );
  }

  const chartData = data.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: p.price,
  }));

  const priceChange = data.length > 1
    ? ((data[data.length - 1].price - data[0].price) / data[0].price) * 100
    : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">
          📈 ${symbol} 價格走勢
        </h3>
        <span
          className={`text-sm font-medium tabular-nums ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
        </span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
              tickFormatter={(v) => formatPrice(v)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value) => [formatPrice(Number(value)), 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
