'use client';

import { useState } from 'react';
import { calculatePremium, getPremiumTierDescription } from '@/lib/insurance/pricing';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';


interface InsurancePanelProps {
  tokenAddress: string;
  tokenSymbol: string;
  riskScore: number;
}

export function InsurancePanel({
  tokenAddress,
  tokenSymbol,
  riskScore,
}: InsurancePanelProps) {
  const { connected, publicKey } = useWallet();
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);

  const purchaseAmount = parseFloat(amount) || 0;
  const quote = calculatePremium(
    tokenAddress,
    tokenSymbol,
    purchaseAmount,
    riskScore
  );
  const tier = getPremiumTierDescription(riskScore);

  const handlePurchase = async () => {
    if (!connected || !publicKey) return;
    setLoading(true);
    try {
      // Build payment transaction via API
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          serviceType: 'insurance',
          amount: quote.premium,
          tokenAddress,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Payment build failed');
      }
      // In production: sign and send the transaction
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
        <Shield className="h-5 w-5 text-cyan-500" />
        交易保險 / Insurance
      </h3>

      {/* Purchase amount input */}
      <div className="mb-4">
        <label htmlFor="coverage" className="text-xs text-gray-400">
          投保金額 (USDC) / Coverage Amount
        </label>
        <input
          id="coverage"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
          min="1"
          max="10000"
          step="1"
        />
      </div>

      {/* Quote summary */}
      <div className="space-y-2 rounded-lg bg-gray-950 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">代幣 / Token</span>
          <span className="text-white font-medium">${tokenSymbol}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">投保金額 / Coverage</span>
          <span className="text-white tabular-nums">{purchaseAmount} USDC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">安全評分 / Risk Score</span>
          <span
            className={`font-medium tabular-nums ${
              riskScore >= 7
                ? 'text-green-400'
                : riskScore >= 4
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {riskScore}/10
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">保費率 / Premium Rate</span>
          <span className="text-white tabular-nums">{tier.rate}</span>
        </div>
        <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
          <span className="text-gray-400">保費 / Premium</span>
          <span className="font-bold text-cyan-400 tabular-nums">
            {quote.premium} USDC
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">理賠金額 / Payout</span>
          <span className="font-bold text-green-400 tabular-nums">
            {quote.payoutAmount} USDC
          </span>
        </div>
      </div>

      {/* Tier info */}
      <div
        className={`mt-3 rounded-lg p-2 text-xs text-center ${
          quote.eligible
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'bg-red-500/10 text-red-400'
        }`}
      >
        {quote.eligible ? (
          <span className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {tier.descriptionZh} / {tier.description}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {quote.reasonZh || quote.reason}
          </span>
        )}
      </div>

      {/* Purchase button */}
      <button
        onClick={handlePurchase}
        disabled={!connected || !quote.eligible || loading || purchaseAmount < 1}
        className="mt-4 w-full rounded-lg bg-cyan-600 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!connected
          ? '連接錢包購買 / Connect Wallet to Purchase'
          : loading
          ? '處理中 / Processing...'
          : `購買保險 ${quote.premium} USDC / Buy Insurance`}
      </button>

      {/* Terms */}
      <p className="mt-2 text-xs text-gray-500 text-center">
        24 小時內 rug（跌 90%+ 或流動性移除）可獲賠 50%
        <br />
        Covers 50% if token rugs within 24h (90%+ drop or liquidity removed)
      </p>
    </div>
  );
}
