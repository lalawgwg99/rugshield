// ═══════════════════════════════════════════════════════════
// RugShield — Type Definitions
// ═══════════════════════════════════════════════════════════

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  confidence?: number;
}

// ─── Token Data ───
export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  createdAt?: number;
  creator?: string;
  metadataUri?: string;
  image?: string;
  description?: string;
  socials?: TokenSocials;
}

export interface TokenSocials {
  twitter?: string;
  telegram?: string;
  website?: string;
}

// ─── Market Data (DexScreener) ───
export interface MarketData {
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  liquidityLocked: boolean;
  pairAddress: string;
  dexId: string;
  txns24h: { buys: number; sells: number };
  priceHistory: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

// ─── Holder Data ───
export interface HolderData {
  address: string;
  amount: number;
  percentage: number;
  isDev?: boolean;
  isKnown?: string;
}

export interface HolderDistribution {
  totalHolders: number;
  top10Percentage: number;
  topHolderPct: number;
  devHoldings: number;
  holders: HolderData[];
}

// ─── Audit Checks ───
export interface AuditCheck {
  id: string;
  name: string;
  nameZh: string;
  status: 'pass' | 'warn' | 'fail' | 'info';
  score: number;
  details: string;
  detailsZh: string;
}

export interface AuditReport {
  token: TokenData;
  market: MarketData | null;
  holders: HolderDistribution | null;
  overallScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  checks: AuditCheck[];
  verdict: string;
  verdictZh: string;
  forensics: ForensicsReport;
  simulation: SimulationResult;
  patterns: PatternMatch;
  timeline: TimelineEvent[];
  createdAt: number;
}

// ─── Forensics ───
export interface ForensicsReport {
  creatorAddress: string;
  tokensCreated: number;
  rugCount: number;
  rugRate: number;
  behaviorRating: string;
  behaviorRatingZh: string;
  fundingSources: FundingSource[];
  associatedWallets: AssociatedWallet[];
}

export interface FundingSource {
  from: string;
  amount: number;
  token: string;
  rugHistory?: number;
}

export interface AssociatedWallet {
  address: string;
  relationship: string;
  riskFlag?: string;
}

// ─── Simulation ───
export interface SimulationResult {
  impacts: PriceImpact[];
}

export interface PriceImpact {
  scenario: string;
  scenarioZh: string;
  sellPercent: number;
  priceDropPercent: number;
}

// ─── Pattern Matching ───
export interface PatternMatch {
  similarTokenCount: number;
  rugRate: number;
  avgSurvivalHours: number;
  matchedPatterns: string[];
  matchedPatternsZh: string[];
}

// ─── Timeline ───
export interface TimelineEvent {
  time: string;
  description: string;
  descriptionZh: string;
  severity: 'info' | 'warn' | 'danger';
}

// ─── Insurance ───
export interface InsurancePolicy {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  purchaseAmount: number;
  premium: number;
  premiumRate: number;
  payoutAmount: number;
  walletAddress: string;
  status: 'active' | 'claimed' | 'expired';
  createdAt: number;
  expiresAt: number;
  claimTriggered?: boolean;
}

export interface InsuranceQuote {
  tokenAddress: string;
  tokenSymbol: string;
  purchaseAmount: number;
  riskScore: number;
  premiumRate: number;
  premium: number;
  payoutAmount: number;
  eligible: boolean;
  reason?: string;
  reasonZh?: string;
}

// ─── Radar Alerts ───
export interface RadarAlert {
  id: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  alertType: RadarAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  suggestedAction: string;
  suggestedActionZh: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export type RadarAlertType =
  | 'dev_movement'
  | 'insider_selling'
  | 'liquidity_drain'
  | 'coordinated_promo'
  | 'whale_dump'
  | 'freeze_authority_used'
  | 'mint_authority_used'
  | 'honeypot_detected';

// ─── Lifecycle ───
export interface LifecycleInfo {
  stage: 'just_created' | 'early' | 'growing' | 'bonding' | 'migrated' | 'unknown';
  stageZh: string;
  progress: number; // 0-100
  bondingCurveProgress?: number;
}

// ─── API Responses ───
export interface AuditApiResponse {
  success: boolean;
  report?: AuditReport;
  error?: string;
}

export interface PaymentBuildRequest {
  walletAddress: string;
  serviceType: 'radar' | 'insurance' | 'full_audit';
  amount: number;
  tokenAddress?: string;
}

export interface PaymentBuildResponse {
  success: boolean;
  transaction?: string; // base64 encoded
  invoiceId?: string;
  error?: string;
}

export interface PaymentVerifyRequest {
  walletAddress: string;
  invoiceId: string;
  signature: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  verified: boolean;
  error?: string;
}

export interface RadarApiResponse {
  success: boolean;
  alerts: RadarAlert[];
  subscribed: boolean;
}

// ─── Money Flow ───
export interface MoneyFlowNode {
  address: string;
  label?: string;
  riskFlag?: string;
}

export interface MoneyFlowEdge {
  from: string;
  to: string;
  amount: number;
  token: string;
}

export interface MoneyFlowGraph {
  nodes: MoneyFlowNode[];
  edges: MoneyFlowEdge[];
}
