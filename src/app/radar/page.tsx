'use client';

import { useState, useEffect } from 'react';
import { RadarAlertCard } from '@/components/RadarAlert';
import type { RadarAlert, RadarApiResponse } from '@/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { Radar, Lock, Loader2, RefreshCw } from 'lucide-react';

export default function RadarPage() {
  const { connected } = useWallet();
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [subscribed] = useState(false); // Would come from backend in production

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('severity', filter);
      params.set('limit', '20');

      const res = await fetch(`/api/radar?${params.toString()}`);
      const data: RadarApiResponse = await res.json();

      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400 mb-4">
          <Radar className="h-3 w-3" />
          <span>即時預警雷達 / Real-time Rug Radar</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          ⚡ Rug 預警雷達 / Rug Radar
        </h1>
        <p className="mt-2 text-sm text-gray-400 max-w-lg mx-auto">
          即時監控 Solana 迷因幣異常動態，主動推送警報
          <br />
          Real-time monitoring of Solana memecoin anomalies with proactive alerts
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
          <div className="text-xl font-bold text-red-400 tabular-nums">{criticalCount}</div>
          <div className="text-xs text-gray-500">危急 / Critical</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
          <div className="text-xl font-bold text-orange-400 tabular-nums">{highCount}</div>
          <div className="text-xs text-gray-500">高風險 / High</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
          <div className="text-xl font-bold text-white tabular-nums">{alerts.length}</div>
          <div className="text-xs text-gray-500">總警報 / Total</div>
        </div>
      </div>

      {/* Filter & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {['all', 'critical', 'high', 'medium'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? '全部 All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          刷新 Refresh
        </button>
      </div>

      {/* Subscription Gate */}
      {!subscribed && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-white">
                訂閱解鎖完整功能 / Subscribe for Full Access
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                免費顯示最新 3 條警報。訂閱雷達服務（5 USDC/月）解鎖：
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Free: latest 3 alerts. Subscribe (5 USDC/mo) to unlock:
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
                <li>• 無限警報 / Unlimited alerts</li>
                <li>• Dev 錢包監控 / Dev wallet monitoring</li>
                <li>• 內部人追蹤 / Insider tracking</li>
                <li>• 即時推送 / Real-time push notifications</li>
              </ul>
              <button
                disabled={!connected}
                className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-xs font-medium text-white hover:bg-yellow-500 disabled:opacity-50 transition-colors"
              >
                {!connected ? '連接錢包訂閱 / Connect to Subscribe' : '訂閱 5 USDC/月 / Subscribe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <Radar className="mx-auto h-8 w-8 text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">暫無警報 / No alerts</p>
          <p className="text-xs text-gray-500 mt-1">
            Radar is monitoring... Alerts will appear when anomalies are detected
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, subscribed ? undefined : 3).map((alert) => (
            <RadarAlertCard key={alert.id} alert={alert} />
          ))}
          {!subscribed && alerts.length > 3 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                還有 {alerts.length - 3} 條警報 / {alerts.length - 3} more alerts
              </p>
              <p className="text-xs text-gray-600 mt-1">訂閱解鎖全部 / Subscribe to unlock all</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
