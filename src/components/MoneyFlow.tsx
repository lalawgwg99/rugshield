'use client';

import { shortenAddress } from '@/lib/utils';
import type { FundingSource, AssociatedWallet } from '@/types';
import { ArrowLeft, AlertTriangle, Wallet } from 'lucide-react';

interface MoneyFlowProps {
  creatorAddress: string;
  fundingSources: FundingSource[];
  associatedWallets: AssociatedWallet[];
}

export function MoneyFlow({
  creatorAddress,
  fundingSources,
  associatedWallets,
}: MoneyFlowProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        💰 資金流向圖 Money Flow
      </h3>

      <div className="space-y-3">
        {/* Creator node */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-cyan-400" />
              <div>
                <div className="text-xs font-medium text-cyan-400">Creator</div>
                <code className="text-xs text-gray-300 font-mono">
                  {shortenAddress(creatorAddress, 8)}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Flow arrows */}
        {fundingSources.map((src, i) => (
          <div key={i} className="ml-8 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-cyan-400 tabular-nums">
                {src.amount.toFixed(1)} {src.token}
              </span>
              <span className="text-gray-500">←</span>
              <code className="text-xs text-gray-400 font-mono">
                {shortenAddress(src.from, 6)}
              </code>
              {src.rugHistory ? (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  {src.rugHistory} rug
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {/* Associated wallets */}
        {associatedWallets.length > 0 && (
          <div className="mt-4 border-t border-gray-700 pt-3">
            <div className="text-xs font-medium text-gray-400 mb-2">
              ⚠️ 關聯錢包 / Associated Wallets
            </div>
            {associatedWallets.map((w, i) => (
              <div
                key={i}
                className="ml-4 flex items-center gap-2 text-xs py-1"
              >
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <code className="text-gray-400 font-mono">
                  {shortenAddress(w.address, 6)}
                </code>
                <span className="text-red-400">{w.riskFlag}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        資金流向圖顯示代幣創建者的資金來源與關聯錢包
        <br />
        Money flow shows funding sources and associated wallets of the token creator
      </p>
    </div>
  );
}
