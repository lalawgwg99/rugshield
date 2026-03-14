# RugShield — AI-Powered Memecoin Insurance & Early Warning System

## 產品定位
不是另一個代幣檢查工具。RugShield 是 Solana memecoin 的保險公司 + 預警雷達。

## 三大核心功能
1. 🔍 代幣安全審計（免費，引流）
2. ⚡ Rug 預警雷達 + 內線追蹤（訂閱制 5 USDC/月）
3. 🔒 交易保險（每筆 1-10% 保費，核心獲利）

## 技術棧
- Next.js 16 App Router + TypeScript + Tailwind CSS v4
- Solana Web3.js + pump.fun Agent Payments SDK
- Recharts（圖表）+ Lucide React（圖標）
- OpenRouter API（AI 報告生成）
- DexScreener API（免費）+ Solana Tracker RPC（免費）

---

## 檔案結構

```
src/
├── app/
│   ├── layout.tsx              # Root layout（暗色主題、WalletProvider）
│   ├── page.tsx                # Landing page
│   ├── audit/
│   │   └── page.tsx            # 免費審計頁面
│   ├── radar/
│   │   └── page.tsx            # 預警雷達（需訂閱）
│   ├── insure/
│   │   └── page.tsx            # 交易保險
│   └── api/
│       ├── audit/
│       │   └── route.ts        # 免費審計 API
│       ├── pay/
│       │   ├── route.ts        # 建構付款交易
│       │   └── verify/
│       │       └── route.ts    # 驗證付款
│       └── radar/
│           └── route.ts        # 雷達數據 API
├── components/
│   ├── WalletProvider.tsx      # Solana wallet adapter
│   ├── Navbar.tsx              # 導航列
│   ├── AuditForm.tsx           # 代幣地址輸入
│   ├── AuditReport.tsx         # 審計報告展示
│   ├── RiskBadge.tsx           # 風險等級標籤
│   ├── PriceChart.tsx          # 價格走勢圖
│   ├── HolderChart.tsx         # 持幣分佈圖
│   ├── MoneyFlow.tsx           # 資金流向圖
│   ├── LifecycleBar.tsx        # Pump.fun 生命週期位置
│   ├── RugCountdown.tsx        # Rug 倒數計時器
│   ├── InsurancePanel.tsx      # 保險購買面板
│   └── RadarAlert.tsx          # 預警通知卡片
├── lib/
│   ├── audit/
│   │   ├── solana.ts           # Solana RPC 資料獲取
│   │   ├── dexscreener.ts      # DexScreener API
│   │   ├── analyzer.ts         # 10+ 項安全檢查
│   │   ├── forensics.ts        # 錢包鑑識（創建者歷史、資金來源）
│   │   ├── simulation.ts       # 價格影響模擬
│   │   ├── patterns.ts         # Rug pattern 歷史比對
│   │   └── report.ts           # AI 雙語報告生成
│   ├── insurance/
│   │   ├── pricing.ts          # 保費計算（基於風險評分）
│   │   └── claims.ts           # 理賠驗證
│   └── utils.ts                # 共用工具
└── types/
    └── index.ts                # TypeScript 型別定義
```

---

## 詳細功能規格

### 1. 免費審計（/audit）

用戶輸入代幣地址 → 免費獲得基礎安全報告

#### 檢查項目（10+ 項）
1. **持幣集中度** — Top 10 錢包佔比
2. **流動性狀態** — 是否鎖定/燒毀
3. **交易量分析** — Volume/MCap 比（洗交易偵測）
4. **代幣年齡** — 創建時間
5. **社群 presence** — Twitter/Telegram/Website
6. **Freeze Authority** — 是否啟用
7. **Mint Authority** — 是否可增發
8. **Metadata 可變性** — 是否可修改
9. **蜜罐偵測** — 買賣比不對稱
10. **創建者鑑識** — 歷史發幣記錄、rug 率
11. **克隆偵測** — 是否抄襲其他代幣
12. **內部人追蹤** — 關聯錢包動向

#### 報告格式（雙語）
```
⚡ 一句話結論 (One-line Verdict)
繁中: "此代幣極高風險，創建者有 3 次 rug 前科，建議避開"
English: "EXTREME RISK - Creator has 3 prior rug pulls, strongly advise avoiding"

📊 安全評分: 2/10 🔴 (信心度 94%)

🔍 創建者鑑識
- 歷史發幣: 12 個
- Rug 率: 67% (8/12)
- 行為評級: 🚨 Serial Rugger
- 資金來源: Wallet A ← Wallet B（已知 rug 前科 3 次）

💰 資金流向圖
[Creator] ← 50 SOL ← [Wallet A]
[Wallet A] ← 200 SOL ← [Scam Wallet B] ⚠️

📈 價格影響模擬
- #1 大戶賣 10% → 價格跌 ~45%
- Dev 全部賣出 → 價格跌 ~92%

⏰ 風險時間線
T+0: 代幣創建
T+2min: 流動性加入 ($2,400)
T+1h: Dev 轉移 30% 代幣到新錢包 ⚠️
T+3h: [當前] 關聯錢包開始小額賣出 🚨

📊 歷史比對
相似特徵代幣（年齡<24h、流動性<$5k）:
- 89% 在 48 小時內歸零
- 平均存活時間: 6.2 小時

🏗️ 生命週期: [████░░░░░░] 15% - Early Stage (極高風險)

✅ 結論: 強烈建議避開。創建者錢包模式與已知 rug pull 高度吻合。
```

### 2. Rug 預警雷達（/radar）— 訂閱制

即時監控，主動推播警報

#### 監控項目
- **Dev Wallet 移動** — 代幣轉移、LP token 移動
- **關聯錢包出貨** — 內線錢包開始賣出
- **流動性異常** — 大額移除
- **協調推廣** — Twitter/Telegram 異常活動
- **大戶鯨魚動向** — Top holder 行為變化

#### 介面
- 即時警報列表（紅/黃/綠分級）
- 每個警報附：代幣名稱、風險原因、建議動作
- 點擊展開完整分析

### 3. 交易保險（/insure）

用戶在買幣前購買保險

#### 保費計算
```
基礎保費 = 3%
風險調整:
  - 安全評分 8-10: 保費 1%
  - 安全評分 5-7: 保費 3%
  - 安全評分 3-4: 保費 6%
  - 安全評分 0-2: 保費 10% 或拒保
```

#### 理賠條件
- 代幣在購買後 24 小時內價格跌超 90%
- 或流動性被完全移除
- 賠付金額 = 投保金額的 50%

#### 保險面板 UI
```
代幣: $SCAM
購買金額: 100 USDC
安全評分: 3/10 🔴
保費率: 6%
保費: 6 USDC
保障: 若 24h 內 rug，賠付 50 USDC

[購買保險] 按鈕 → pump.fun 付款
```

---

## 付款整合

### pump.fun SDK 流程
```
1. 用戶連接錢包（Phantom/Solflare）
2. 後端建構付款交易（buildAcceptPaymentInstructions）
3. 前端簽名 + 送鏈上
4. 後端驗證付款（validateInvoicePayment）
5. 解鎖服務（雷達訂閱 / 保險生效）
```

### 收費項目
| 服務 | 價格 | 幣種 |
|---|---|---|
| 基礎審計 | 免費 | — |
| 完整審計（含鑑識）| 0.1 USDC | USDC |
| 雷達月費 | 5 USDC/月 | USDC |
| 單次保險 | 1-10% 保費 | USDC |

---

## 設計規範

### 主題：暗色系 Crypto Native
- 背景: `bg-gray-950`
- 卡片: `bg-gray-900`
- 邊框: `border-gray-800`
- 主色: `cyan-500`（連結、強調）
- 危險: `red-500`
- 警告: `yellow-500`
- 安全: `green-500`

### 字體
- 使用 system font stack（Apple system fonts）
- 數字用 tabular-nums

### RWD
- Mobile-first
- max-w-4xl 居中
- 卡片式佈局

---

## 環境變數
```
SOLANA_RPC_URL=https://rpc.solanatracker.io/public
NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.solanatracker.io/public
AGENT_TOKEN_MINT_ADDRESS=placeholder
CURRENCY_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
OPENROUTER_API_KEY=placeholder
PRICE_AMOUNT=100000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 建置順序
1. 型別定義（types/index.ts）
2. 資料層（lib/audit/*）
3. API 路由（app/api/*）
4. 共用組件（components/*）
5. 頁面（app/page.tsx, app/audit/*, app/radar/*, app/insure/*）
6. README.md（完整產品說明）
