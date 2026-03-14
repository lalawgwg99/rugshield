'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuditForm } from '@/components/AuditForm';
import { AuditReport } from '@/components/AuditReport';
import type { AuditReport as AuditReportType, AuditApiResponse } from '@/types';
import { AlertTriangle, Loader2, Shield } from 'lucide-react';

function AuditPageInner() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReportType | null>(null);
  const [error, setError] = useState('');

  const handleAudit = async (address: string) => {
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const res = await fetch(`/api/audit?token=${encodeURIComponent(address)}`);
      const data: AuditApiResponse = await res.json();

      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setError(data.error || 'Audit failed / 審計失敗');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error / 網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 mb-4">
          <Shield className="h-3 w-3" />
          <span>免費代幣安全審計 / Free Token Security Audit</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          🔍 代幣安全審計 / Token Audit
        </h1>
        <p className="mt-2 text-sm text-gray-400 max-w-lg mx-auto">
          輸入任何 Solana SPL 代幣地址，獲得 12+ 項安全檢查、創建者鑑識和風險評分
          <br />
          Enter any Solana SPL token address for 12+ security checks, creator forensics, and risk scoring
        </p>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto">
        <AuditForm onSubmit={handleAudit} loading={loading} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mb-3" />
          <p className="text-sm text-gray-400">分析中... / Analyzing...</p>
          <p className="text-xs text-gray-500 mt-1">
            Running 12+ security checks, fetching on-chain data
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-xl mx-auto rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Report */}
      {report && <AuditReport report={report} />}

      {/* Initial state */}
      {!loading && !report && !error && initialToken && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.querySelector('input')?.value && document.querySelector('form')?.dispatchEvent(new Event('submit', {bubbles: true}))`,
          }}
        />
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">🔍 代幣安全審計 / Token Audit</h1>
        </div>
      </div>
    }>
      <AuditPageInner />
    </Suspense>
  );
}
