'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { isValidSolanaAddress } from '@/lib/utils';

interface AuditFormProps {
  onSubmit: (address: string) => void;
  loading?: boolean;
}

export function AuditForm({ onSubmit, loading }: AuditFormProps) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();

    if (!trimmed) {
      setError('Please enter a token address / 請輸入代幣地址');
      return;
    }

    if (!isValidSolanaAddress(trimmed)) {
      setError('Invalid Solana address / 無效的 Solana 地址');
      return;
    }

    setError('');
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError('');
          }}
          placeholder="Enter token address... / 輸入代幣地址..."
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-12 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-cyan-600 p-2 text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </button>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Free basic audit / 免費基礎審計 • Paste any Solana SPL token address
      </p>
    </form>
  );
}
