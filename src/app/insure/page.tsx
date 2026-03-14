'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { Shield, CheckCircle2, AlertTriangle, Loader2, Search } from 'lucide-react';
import { isValidSolanaAddress, shortenAddress } from '@/lib/utils';
import { calculatePremium, getPremiumTierDescription } from '@/lib/insurance/pricing';
import { getRiskLevel, getRiskColor, getRiskEmoji } from '@/lib/utils';

export default function InsurePage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    if (!isValidSolanaAddress(tokenAddress)) {
      setError('Invalid Solana address / 無效的 Solana 地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch basic audit to get risk score
      const res = await fetch(`/api/audit?token=${encodeURIComponent(tokenAddress)}`);
      const data = await res.json();

      if (data.success && data.report) {
        setRiskScore(data.report.overallScore);
        setTokenSymbol(data.report.token.symbol);
      } else {
        setError(data.error || 'Failed to analyze token / 分析失敗');
      }
    } catch {
      setError('Network error / 網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  const purchaseAmount = parseFloat(amount) || 0;
  const quote = riskScore !== null
    ? calculatePremium(tokenAddress, tokenSymbol, purchaseAmount, riskScore)
    : null;
  const premium = quote?.premium ?? 0;
  const tier = riskScore !== null ? getPremiumTierDescription(riskScore) : null;

  const handlePurchase = async () => {
    if (!publicKey || !signTransaction) { setError('Connect wallet first'); return; }
    setLoading(true);
    try {
      // 1. Build transaction
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          amount: premium,
          serviceType: 'insurance',
        }),
      });
      const { transaction: txBase64, invoice } = await res.json();
      
      // 2. Sign with wallet
      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
      const signedTx = await signTransaction(tx);
      
      // 3. Send to chain
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
      
      // 4. Verify on server
      const verifyRes = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          invoice,
          signature,
        }),
      });
      const { verified } = await verifyRes.json();
      
      if (verified) {
        // Success handled silently or by external router as placeholder
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400 mb-4">
          <Shield className="h-3 w-3" />
          <span>交易保險 / Transaction Insurance</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          🔒 交易保險 / Insurance
        </h1>
        <p className="mt-2 text-sm text-gray-400 max-w-lg mx-auto">
          為你的迷因幣交易投保。若代幣在 24 小時內 rug（跌 90%+ 或流動性移除），獲賠 50%
          <br />
          Insure your memecoin trades. Get 50% payout if the token rugs within 24 hours.
        </p>
      </div>

      {/* How Insurance Works */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          理賠條件 / Claim Conditions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg bg-gray-950 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <span className="font-medium text-white">價格跌超 90%</span>
              <span className="text-gray-500"> / Price drops &gt;90% in 24h</span>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-gray-950 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <span className="font-medium text-white">流動性被移除</span>
              <span className="text-gray-500"> / Liquidity removed</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          賠付金額 = 投保金額的 50% / Payout = 50% of insured amount
        </p>
      </div>

      {/* Step 1: Token Lookup */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          步驟 1：輸入代幣地址 / Step 1: Enter Token Address
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => {
              setTokenAddress(e.target.value);
              setError('');
              setRiskScore(null);
            }}
            placeholder="Enter token address... / 輸入代幣地址..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none font-mono text-sm"
          />
          <button
            onClick={handleLookup}
            disabled={loading || !tokenAddress}
            className="flex items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            分析 Analyze
          </button>
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-1 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Risk Score Display */}
        {riskScore !== null && tokenSymbol && (
          <div className="mt-4 rounded-lg bg-gray-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-white">${tokenSymbol}</div>
                <code className="text-xs text-gray-500 font-mono">
                  {shortenAddress(tokenAddress)}
                </code>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getRiskColor(getRiskLevel(riskScore))}`}>
                  {getRiskEmoji(getRiskLevel(riskScore))} {riskScore}/10
                </div>
                <div className="text-xs text-gray-500">
                  {tier?.tierZh} / {tier?.tier}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Configure Insurance */}
      {riskScore !== null && quote && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            步驟 2：設定保險 / Step 2: Configure Insurance
          </h2>

          {/* Amount Input */}
          <div className="mb-4">
            <label htmlFor="amount" className="text-xs text-gray-400">
              投保金額 (USDC) / Coverage Amount
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              min="1"
              max="10000"
            />
          </div>

          {/* Quote Summary */}
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
              <span className="text-gray-400">風險評分 / Risk Score</span>
              <span className={`font-medium tabular-nums ${getRiskColor(getRiskLevel(riskScore))}`}>
                {riskScore}/10
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">保費率 / Premium Rate</span>
              <span className="text-white tabular-nums">{tier?.rate}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
              <span className="text-gray-400">保費 / Premium</span>
              <span className="font-bold text-cyan-400 tabular-nums">{quote.premium} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">理賠金額 / Payout</span>
              <span className="font-bold text-green-400 tabular-nums">{quote.payoutAmount} USDC</span>
            </div>
          </div>

          {/* Tier Info */}
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
                {tier?.descriptionZh} / {tier?.description}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {quote.reasonZh || quote.reason}
              </span>
            )}
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={!connected || !quote.eligible || loading}
            className="mt-4 w-full rounded-lg bg-cyan-600 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            {!connected
              ? '連接錢包購買 / Connect Wallet'
              : loading
              ? '處理中 / Processing...'
              : `🔒 購買保險 ${quote.premium} USDC / Buy Insurance`}
          </button>
        </div>
      )}

      {/* Premium Tiers */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          保費率表 / Premium Tiers
        </h2>
        <div className="space-y-2">
          {[
            { range: '8-10', rate: '1%', label: '安全 / Safe', color: 'text-green-400' },
            { range: '5-7', rate: '3%', label: '標準 / Standard', color: 'text-yellow-400' },
            { range: '3-4', rate: '6%', label: '高風險 / Risky', color: 'text-orange-400' },
            { range: '0-2', rate: '10%', label: '極高風險 / Extreme', color: 'text-red-400' },
          ].map((tier) => (
            <div
              key={tier.range}
              className="flex items-center justify-between rounded-lg bg-gray-950 px-4 py-2"
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${tier.color}`}>
                  {tier.label}
                </span>
                <span className="text-xs text-gray-500">Score {tier.range}</span>
              </div>
              <span className="text-sm font-bold text-white tabular-nums">
                {tier.rate}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
