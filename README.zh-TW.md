# 🛡️ RugShield — AI 迷因幣保險與預警系統

> **不是另一個代幣檢查工具。** RugShield 是 Solana 迷因幣的保險公司 + 預警雷達。

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Solana](https://img.shields.io/badge/Solana-Web3.js-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## 🎯 產品概述

RugShield 為 Solana 迷因幣交易者提供三大核心服務：

| 服務 | 說明 | 定價 |
|------|------|------|
| 🔍 **代幣審計** | 12+ 項安全檢查、創建者鑑識、風險評分 | **免費** |
| ⚡ **Rug 預警雷達** | 即時監控、內部人追蹤、Dev 錢包警報 | **5 USDC/月** |
| 🔒 **交易保險** | 代幣 24 小時內 rug 獲賠 50% | **1-10% 保費** |

### 獨特價值主張

與傳統代幣檢查工具只顯示靜態資料不同，RugShield 提供：

1. **創建者鑑識** — 追蹤創建者的鏈上歷史、計算 rug 率、識別慣犯
2. **價格影響模擬** — 模擬大戶賣出時的價格影響（bonding curve 數學模型）
3. **交易保險** — 透過鏈上保險合約實際保護你的交易
4. **主動預警雷達** — 在 rug 發生前收到警報，而非事後

---

## 🔍 功能詳解

### 1. 代幣審計（`/audit`）

全面的 12 點安全分析：

| # | 檢查項目 | 說明 |
|---|---------|------|
| 1 | **持幣集中度** | 前 10 大錢包持有供應量百分比 |
| 2 | **流動性狀態** | 池子大小與鎖定狀態 |
| 3 | **交易量分析** | 刷量交易偵測（交易量/市值比） |
| 4 | **代幣年齡** | 自創建以來的時間 |
| 5 | **社群存在** | Twitter、Telegram、網站連結 |
| 6 | **凍結權限** | 代幣是否可被凍結？ |
| 7 | **鑄造權限** | 是否可增發更多代幣？ |
| 8 | **Metadata 可變性** | 代幣 metadata 是否可被修改？ |
| 9 | **蜜罐偵測** | 買入/賣出比不對稱 |
| 10 | **創建者鑑識** | 發幣歷史、rug 率 |
| 11 | **克隆偵測** | 是否為其他代幣的複製？ |
| 12 | **內部人追蹤** | 關聯錢包動向 |

**報告輸出：**
```
⚡ 一句話結論（雙語）
📊 安全評分: X/10 🔴🟡🟢（信心度 XX%）
🔬 創建者鑑識（發幣數、rug 率、行為評級）
💰 資金流向（資金來源、關聯錢包）
📈 價格影響模擬（假設賣出情境）
📊 歷史模式比對（相似代幣 rug 率）
🏗️ 生命週期位置（bonding curve 進度）
⏰ 風險時間線（按時間排序的事件）
```

### 2. Rug 預警雷達（`/radar`）

即時監控與推送警報：

- **Dev 錢包移動** — 代幣轉移、LP 代幣移動
- **內部人賣出** — 關聯錢包開始拋售
- **流動性異常** — 大額流動性移除
- **協調推廣** — 社群媒體異常活動
- **大戶拋售** — 持幣大戶行為變化

警報嚴重程度：🔵 低 → 🟡 中 → 🟠 高 → 🔴 危急

### 3. 交易保險（`/insure`）

保護你的迷因幣交易：

```
投保金額: 100 USDC
風險評分: 3/10 🔴
保費率: 6%
保費: 6 USDC
理賠金額（若 rug）: 50 USDC
```

**理賠條件：**
- 代幣價格在購買後 24 小時內下跌超過 90%
- 或流動性被完全移除
- 賠付 = 投保金額的 50%

---

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    RugShield 前端                        │
│              Next.js 16 App Router + React 19            │
│          Tailwind CSS v4 + Recharts + Lucide            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  審計   │  │   雷達   │  │   保險   │  │  付款   │ │
│  │  頁面   │  │   頁面   │  │   頁面   │  │  流程   │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │            │             │              │       │
├───────┼────────────┼─────────────┼──────────────┼───────┤
│       ▼            ▼             ▼              ▼       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API 路由 (Next.js)                  │   │
│  │  /api/audit  /api/radar  /api/pay  /api/pay/verify│  │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
├─────────────────────────┼───────────────────────────────┤
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │              資料層 (lib/)                        │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐    │   │
│  │  │ Solana   │ │DexScreener│ │   分析器     │    │   │
│  │  │  RPC     │ │   API     │ │  (12 項檢查) │    │   │
│  │  └──────────┘ └───────────┘ └──────────────┘    │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐    │   │
│  │  │  鑑識    │ │  模擬     │ │  模式比對    │    │   │
│  │  │ (錢包)   │ │(bonding)  │ │  (匹配)      │    │   │
│  │  └──────────┘ └───────────┘ └──────────────┘    │   │
│  │  ┌──────────┐ ┌───────────┐                     │   │
│  │  │AI 報告   │ │  保險     │                     │   │
│  │  │(OpenRouter)│ │(定價)    │                     │   │
│  │  └──────────┘ └───────────┘                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  外部服務                                │
│  Solana RPC │ DexScreener API │ OpenRouter │ pump.fun   │
└─────────────────────────────────────────────────────────┘
```

---

## 📡 API 文件

### `GET /api/audit?token=<地址>`

對代幣執行完整安全審計。

**參數：**
- `token`（必填）：Solana SPL 代幣地址

**回應：**
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

建立服務購買付款交易。

**請求體：**
```json
{
  "walletAddress": "...",
  "serviceType": "radar" | "insurance" | "full_audit",
  "amount": 5.0,
  "tokenAddress": "..."  // 保險時必填
}
```

### `POST /api/pay/verify`

驗證已完成的付款並解鎖服務。

**請求體：**
```json
{
  "walletAddress": "...",
  "invoiceId": "...",
  "signature": "..."
}
```

### `GET /api/radar?severity=<等級>&limit=<數量>`

取得預警警報。

**參數：**
- `severity`（選填）：`low` | `medium` | `high` | `critical`
- `limit`（選填）：最大結果數（預設 20）

---

## 🚀 安裝說明

### 系統需求

- Node.js 18+（建議：Node.js 22）
- npm 或 yarn

### 安裝步驟

```bash
# 複製儲存庫
git clone https://github.com/lalawgwg99/rugshield.git
cd rugshield

# 安裝相依套件
npm install

# 建立環境變數檔案
cp .env.local.example .env.local
# 編輯 .env.local 並填入你的 API 金鑰

# 啟動開發伺服器
npm run dev
```

### 環境變數

```env
SOLANA_RPC_URL=https://rpc.solanatracker.io/public
NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.solanatracker.io/public
AGENT_TOKEN_MINT_ADDRESS=placeholder
CURRENCY_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
OPENROUTER_API_KEY=placeholder
PRICE_AMOUNT=100000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 建置生產版本

```bash
npm run build
npm start
```

---

## 💰 收費方案

| 服務 | 價格 | 幣種 | 說明 |
|------|------|------|------|
| 基礎審計 | **免費** | — | 12 項安全檢查、基礎報告 |
| 完整審計（含鑑識）| **0.1 USDC** | USDC | 深度創建者分析、完整報告 |
| Rug 預警雷達 | **5 USDC/月** | USDC | 即時警報、內部人追蹤 |
| 保險（安全代幣）| **1%** | USDC | 評分 8-10 |
| 保險（標準）| **3%** | USDC | 評分 5-7 |
| 保險（高風險）| **6%** | USDC | 評分 3-4 |
| 保險（極高風險）| **10%** | USDC | 評分 0-2（可能拒保） |

---

## 📸 截圖

<!-- 請在此處加入截圖 -->

| 審計報告 | Rug 預警 | 保險 |
|---------|---------|------|
| ![審計](screenshots/audit.png) | ![雷達](screenshots/radar.png) | ![保險](screenshots/insurance.png) |

---

## 🛠️ 技術棧

- **框架：** Next.js 16（App Router）
- **語言：** TypeScript 5
- **樣式：** Tailwind CSS v4
- **圖表：** Recharts
- **圖標：** Lucide React
- **區塊鏈：** Solana Web3.js + SPL Token
- **錢包：** @solana/wallet-adapter（Phantom、Solflare）
- **付款：** pump.fun Agent Payments SDK
- **AI：** OpenRouter API（Claude 3.5 Sonnet）
- **市場資料：** DexScreener API
- **RPC：** Solana Tracker Public RPC

---

## 📄 授權

MIT 授權 — 詳情請參閱 [LICENSE](LICENSE)。

---

## ⚠️ 免責聲明

審計結果僅供參考，不構成投資建議。加密貨幣投資存在重大風險。保險可用性取決於代幣風險評估。過去的表現不代表未來的結果。

---

## 🤝 貢獻指南

歡迎貢獻！請開啟 Issue 或提交 Pull Request。

1. Fork 此儲存庫
2. 建立你的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交變更（`git commit -m 'feat: 新增超棒功能'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 開啟 Pull Request
