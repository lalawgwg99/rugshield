import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { Navbar } from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RugShield — AI Memecoin Insurance & Early Warning System',
  description:
    'RugShield 是 Solana memecoin 的保險公司 + 預警雷達。AI-powered token audit, real-time rug radar, and transaction insurance for Solana memecoins.',
  keywords: ['solana', 'memecoin', 'rug pull', 'insurance', 'audit', 'defi', 'crypto'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        <WalletProvider>
          <Navbar />
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
