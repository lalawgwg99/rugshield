'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Radar, FileSearch, Lock } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Home', labelZh: '首頁', icon: Shield },
  { href: '/audit', label: 'Audit', labelZh: '審計', icon: FileSearch },
  { href: '/radar', label: 'Radar', labelZh: '雷達', icon: Radar },
  { href: '/insure', label: 'Insure', labelZh: '保險', icon: Lock },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-cyan-500" />
          <span className="text-lg font-bold text-white">
            Rug<span className="text-cyan-500">Shield</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map(({ href, label, labelZh, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-800 text-cyan-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className="text-xs text-gray-500">/ {labelZh}</span>
              </Link>
            );
          })}
        </div>

        {/* Wallet Button */}
        <div className="flex items-center gap-2">
          <WalletMultiButton className="!bg-cyan-600 !rounded-lg !text-sm !font-medium hover:!bg-cyan-500" />
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="flex border-t border-gray-800 sm:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
                isActive ? 'text-cyan-400' : 'text-gray-500'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
