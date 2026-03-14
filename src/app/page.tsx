'use client';

import Link from 'next/link';
import {
  Shield,
  Radar,
  Lock,
  Search,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    title: 'Token Audit',
    titleZh: '代幣審計',
    description: '12+ security checks including holder analysis, honeypot detection, and creator forensics.',
    descriptionZh: '12+ 項安全檢查，包含持幣分析、蜜罐偵測和創建者鑑識。',
    href: '/audit',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  {
    icon: Radar,
    title: 'Rug Radar',
    titleZh: 'Rug 預警雷達',
    description: 'Real-time monitoring of dev wallets, insider selling, liquidity drains, and coordinated promotions.',
    descriptionZh: '即時監控 Dev 錢包、內部人賣出、流動性異常和協調推廣。',
    href: '/radar',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  {
    icon: Lock,
    title: 'Insurance',
    titleZh: '交易保險',
    description: 'Insure your memecoin trades. Get 50% payout if the token rugs within 24 hours.',
    descriptionZh: '為你的迷因幣交易投保。若代幣 24 小時內 rug，獲賠 50%。',
    href: '/insure',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
];

const STATS = [
  { value: '89%', label: 'Detection Rate', labelZh: '偵測率' },
  { value: '< 3s', label: 'Audit Speed', labelZh: '審計速度' },
  { value: '12+', label: 'Security Checks', labelZh: '安全檢查' },
  { value: '50%', label: 'Insurance Payout', labelZh: '保險賠付' },
];

export default function Home() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 text-center">
        {/* Glow effect */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 mb-6">
          <Shield className="h-3 w-3" />
          <span>AI-Powered Solana Memecoin Protection</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="text-white">Rug</span>
          <span className="text-cyan-400">Shield</span>
        </h1>

        <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
          不是另一個代幣檢查工具。是 Solana memecoin 的
          <span className="text-white font-medium">保險公司</span> +
          <span className="text-white font-medium">預警雷達</span>
        </p>
        <p className="mt-1 text-sm text-gray-500 max-w-xl mx-auto">
          Not another token checker. It&apos;s an insurance company + early warning system for Solana memecoins.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
          >
            <Search className="h-4 w-4" />
            免費審計 Free Audit
          </Link>
          <Link
            href="/radar"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            <Radar className="h-4 w-4" />
            預警雷達 Rug Radar
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center"
          >
            <div className="text-2xl font-bold text-white tabular-nums">
              {stat.value}
            </div>
            <div className="text-xs text-gray-500">
              {stat.labelZh} / {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          三大核心功能 / Three Core Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className={`group rounded-xl border ${feature.border} ${feature.bg} p-6 transition-all hover:scale-[1.02]`}
              >
                <Icon className={`h-8 w-8 ${feature.color} mb-3`} />
                <h3 className="text-lg font-semibold text-white">
                  {feature.titleZh}
                </h3>
                <p className="text-xs text-gray-400 mb-1">{feature.title}</p>
                <p className="text-sm text-gray-300 mt-2">
                  {feature.descriptionZh}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {feature.description}
                </p>
                <div className={`mt-3 inline-flex items-center gap-1 text-sm ${feature.color} group-hover:gap-2 transition-all`}>
                  Learn more <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it Works */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          運作方式 / How It Works
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { step: '1', icon: Search, text: '輸入代幣地址', textEn: 'Enter token address' },
            { step: '2', icon: AlertTriangle, text: 'AI 分析 12+ 項安全指標', textEn: 'AI analyzes 12+ security metrics' },
            { step: '3', icon: TrendingDown, text: '查看風險報告與模擬', textEn: 'View risk report & simulation' },
            { step: '4', icon: CheckCircle2, text: '選擇保險或預警訂閱', textEn: 'Choose insurance or radar' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
                  {item.step}
                </div>
                <Icon className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                <p className="text-sm text-white">{item.text}</p>
                <p className="text-xs text-gray-500">{item.textEn}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          收費方案 / Pricing
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-700 bg-gray-950 p-4">
            <div className="text-sm font-medium text-cyan-400">免費 Free</div>
            <div className="text-2xl font-bold text-white mt-1">基礎審計</div>
            <div className="text-xs text-gray-500">Basic Audit</div>
            <ul className="mt-3 space-y-1 text-sm text-gray-400">
              <li>✅ 12 項安全檢查 / 12 security checks</li>
              <li>✅ 基礎風險評分 / Basic risk score</li>
              <li>✅ 持幣分析 / Holder analysis</li>
            </ul>
          </div>
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
            <div className="text-sm font-medium text-yellow-400">訂閱制 Subscription</div>
            <div className="text-2xl font-bold text-white mt-1">5 USDC/月</div>
            <div className="text-xs text-gray-500">Rug Radar</div>
            <ul className="mt-3 space-y-1 text-sm text-gray-400">
              <li>✅ 即時預警通知 / Real-time alerts</li>
              <li>✅ Dev 錢包監控 / Dev wallet tracking</li>
              <li>✅ 內部人追蹤 / Insider tracking</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
        <p>
          RugShield © 2024 — AI-Powered Solana Memecoin Protection
        </p>
        <p className="mt-1">
          ⚠️ 審計結果僅供參考，不構成投資建議 / Audit results are for reference only, not financial advice.
        </p>
      </footer>
    </div>
  );
}
