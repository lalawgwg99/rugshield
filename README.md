# 🛡️ RugShield — AI-Powered Memecoin Insurance & Early Warning System

> **Not another token checker.** RugShield is an insurance company + early warning system for Solana memecoins.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Solana](https://img.shields.io/badge/Solana-Web3.js-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## 🎯 Product Overview

RugShield provides three core services for Solana memecoin traders:

| Service | Description | Pricing |
|---------|-------------|---------|
| 🔍 **Token Audit** | 12+ security checks, creator forensics, risk scoring | **Free** |
| ⚡ **Rug Radar** | Real-time monitoring, insider tracking, dev wallet alerts | **5 USDC/month** |
| 🔒 **Insurance** | 50% payout if token rugs within 24 hours | **1-10% premium** |

### Unique Value Proposition

Unlike traditional token checkers that only show static data, RugShield offers:

1. **Creator Forensics** — Trace the creator's on-chain history, calculate rug rate, identify serial ruggers
2. **Price Impact Simulation** — Model what happens when large holders sell (bonding curve math)
3. **Transaction Insurance** — Actually protect your trades with on-chain insurance contracts
4. **Proactive Radar** — Get alerted BEFORE the rug happens, not after

---

## 🔍 Features

### 1. Token Audit (`/audit`)

Comprehensive 12-point security analysis:

| # | Check | Description |
|---|-------|-------------|
| 1 | **Holder Concentration** | Top 10 wallet supply percentage |
| 2 | **Liquidity Status** | Pool size and lock status |
| 3 | **Volume Analysis** | Wash trading detection (volume/mcap ratio) |
| 4 | **Token Age** | Time since creation |
| 5 | **Social Presence** | Twitter, Telegram, Website links |
| 6 | **Freeze Authority** | Can tokens be frozen? |
| 7 | **Mint Authority** | Can more tokens be minted? |
| 8 | **Metadata Mutability** | Can token metadata be changed? |
| 9 | **Honeypot Detection** | Buy/sell ratio asymmetry |
| 10 | **Creator Forensics** | History of token creation, rug rate |
| 11 | **Clone Detection** | Is this a copy of another token? |
| 12 | **Insider Tracking** | Related wallet movements |

**Report Output:**
```
⚡ One-line Verdict (bilingual)
📊 Safety Score: X/10 🔴🟡🟢 (confidence XX%)
🔬 Creator Forensics (tokens created, rug rate, behavior rating)
💰 Money Flow (funding sources, associated wallets)
📈 Price Impact Simulation (what-if sell scenarios)
📊 Historical Pattern Match (similar token rug rates)
🏗️ Lifecycle Position (bonding curve progress)
⏰ Risk Timeline (chronological events)
```

### 2. Rug Radar (`/radar`)

Real-time monitoring with push alerts:

- **Dev Wallet Movement** — Token transfers, LP token movement
- **Insider Selling** — Connected wallets beginning to sell
- **Liquidity Drain** — Large liquidity removal
- **Coordinated Promotion** — Unusual social media activity
- **Whale Dumping** — Top holder behavior changes

Alert severity levels: 🔵 Low → 🟡 Medium → 🟠 High → 🔴 Critical

### 3. Transaction Insurance (`/insure`)

Protect your memecoin trades:

```
Coverage Amount: 100 USDC
Risk Score: 3/10 🔴
Premium Rate: 6%
Premium: 6 USDC
Payout (if rug): 50 USDC
```

**Claim Conditions:**
- Token price drops >90% within 24 hours of purchase
- OR liquidity is completely removed
- Payout = 50% of insured amount

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RugShield Frontend                    │
│              Next.js 16 App Router + React 19            │
│          Tailwind CSS v4 + Recharts + Lucide            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Audit  │  │  Radar   │  │ Insurance│  │ Payment │ │
│  │  Page   │  │  Page    │  │  Page    │  │  Flow   │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │            │             │              │       │
├───────┼────────────┼─────────────┼──────────────┼───────┤
│       ▼            ▼             ▼              ▼       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API Routes (Next.js)                │   │
│  │  /api/audit  /api/radar  /api/pay  /api/pay/verify│  │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
├─────────────────────────┼───────────────────────────────┤
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Data Layer (lib/)                    │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐    │   │
│  │  │ Solana   │ │DexScreener│ │   Analyzer   │    │   │
│  │  │  RPC     │ │   API     │ │  (12 checks) │    │   │
│  │  └──────────┘ └───────────┘ └──────────────┘    │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐    │   │
│  │  │Forensics │ │Simulation │ │   Patterns   │    │   │
│  │  │ (wallets)│ │(bonding)  │ │  (matching)  │    │   │
│  │  └──────────┘ └───────────┘ └──────────────┘    │   │
│  │  ┌──────────┐ ┌───────────┐                     │   │
│  │  │ AI Report│ │ Insurance │                     │   │
│  │  │(OpenRouter)│ │(pricing) │                     │   │
│  │  └──────────┘ └───────────┘                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  External Services                       │
│  Solana RPC │ DexScreener API │ OpenRouter │ pump.fun   │
└─────────────────────────────────────────────────────────┘
```

---

## 📡 API Documentation

### `GET /api/audit?token=<address>`

Run a full security audit on a token.

**Parameters:**
- `token` (required): Solana SPL token address

**Response:**
```json
{
  "success": true,
  "report": {
    "token": { "address", "name", "symbol", "decimals", "supply" },
    "overallScore": 3,
    "riskLevel": "high",
    "confidence": 85,
    "checks": [...],
    "verdict": "EXTREME RISK - ...",
    "verdictZh": "此代幣極高風險...",
    "forensics": {...},
    "simulation": {...},
    "patterns": {...},
    "timeline": [...]
  }
}
```

### `POST /api/pay`

Build a payment transaction for service purchase.

**Body:**
```json
{
  "walletAddress": "...",
  "serviceType": "radar" | "insurance" | "full_audit",
  "amount": 5.0,
  "tokenAddress": "..."  // required for insurance
}
```

### `POST /api/pay/verify`

Verify a completed payment and unlock service.

**Body:**
```json
{
  "walletAddress": "...",
  "invoiceId": "...",
  "signature": "..."
}
```

### `GET /api/radar?severity=<level>&limit=<n>`

Fetch radar alerts.

**Parameters:**
- `severity` (optional): `low` | `medium` | `high` | `critical`
- `limit` (optional): max results (default 20)

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ (recommended: Node.js 22)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/lalawgwg99/rugshield.git
cd rugshield

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Environment Variables

```env
SOLANA_RPC_URL=https://rpc.solanatracker.io/public
NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.solanatracker.io/public
AGENT_TOKEN_MINT_ADDRESS=placeholder
CURRENCY_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
OPENROUTER_API_KEY=placeholder
PRICE_AMOUNT=100000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

---

## 💰 Pricing Model

| Service | Price | Currency | Description |
|---------|-------|----------|-------------|
| Basic Audit | **Free** | — | 12 security checks, basic report |
| Full Audit (with forensics) | **0.1 USDC** | USDC | Deep creator analysis, full report |
| Rug Radar | **5 USDC/month** | USDC | Real-time alerts, insider tracking |
| Insurance (Safe tokens) | **1%** | USDC | Score 8-10 |
| Insurance (Standard) | **3%** | USDC | Score 5-7 |
| Insurance (Risky) | **6%** | USDC | Score 3-4 |
| Insurance (Extreme) | **10%** | USDC | Score 0-2 (may be refused) |

---

## 📸 Screenshots

<!-- Add screenshots here -->

| Audit Report | Rug Radar | Insurance |
|-------------|-----------|-----------|
| ![Audit](screenshots/audit.png) | ![Radar](screenshots/radar.png) | ![Insurance](screenshots/insurance.png) |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React
- **Blockchain:** Solana Web3.js + SPL Token
- **Wallet:** @solana/wallet-adapter (Phantom, Solflare)
- **Payments:** pump.fun Agent Payments SDK
- **AI:** OpenRouter API (Claude 3.5 Sonnet)
- **Market Data:** DexScreener API
- **RPC:** Solana Tracker Public RPC

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## ⚠️ Disclaimer

Audit results are for reference only and do not constitute financial advice. Cryptocurrency investments carry significant risk. Insurance availability depends on token risk assessment. Past performance does not indicate future results.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
