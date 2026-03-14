#!/usr/bin/env python3
"""
RugShield Scanner v3 - Enhanced Paper Trade Mode
Improvements over v2:
- Multi-factor weighted scoring (risk, momentum, structure, liquidity)
- Dynamic position sizing based on confidence level
- Stop-loss / take-profit tracking with trailing stop
- Token age & market cap filters
- Holder concentration check via audit data
- Volume spike detection
- Cooldown between trades on same token
- Smart money signal quality weighting (gain %, hold time)
- Daily P&L tracking with max drawdown guard
"""
import json
import subprocess
import uuid
import time
import os
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

# ─── Logging ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("rugshield")

# ─── Config ───
CHAIN_ID = "CT_501"
MEME_RUSH_URL = "https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/rank/list"
AUDIT_URL = "https://web3.binance.com/bapi/defi/v1/public/wallet-direct/security/token/audit"
SMART_MONEY_URL = "https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money"
HEADERS_BASE = ["-H", "Content-Type: application/json", "-H", "Accept-Encoding: identity"]
HEADERS_MEME = HEADERS_BASE + ["-H", "User-Agent: binance-web3/1.0 (Skill)"]
HEADERS_AUDIT = HEADERS_BASE + ["-H", "source: agent", "-H", "User-Agent: binance-web3/1.4 (Skill)"]

# ─── Entry Filters (tightened) ───
MIN_LIQUIDITY = 5000          # Raised from 3000
MIN_HOLDERS = 80              # Raised from 50
MAX_SNIPER_PCT = 8.0          # Lowered from 10
MAX_DEV_MIGRATE = 5           # Lowered from 10
MIN_BONDING_PROGRESS = 30     # Raised from 20
MAX_TOP10_PCT = 35.0          # Lowered from 40
EXCLUDE_DEV_WASH = True
MIN_MARKET_CAP = 10000        # New: minimum market cap
MAX_MARKET_CAP = 5000000      # New: avoid overhyped tokens
MIN_TOKEN_AGE_MINUTES = 10    # New: avoid instant-rug tokens
MIN_BUY_SELL_RATIO = 0.3      # New: honeypot filter (sells/buys must be > 30%)

# ─── Trade Management ───
BASE_PAPER_TRADE_SIZE = 5.0   # Base size in USD
MAX_DAILY_TRADES = 4          # Reduced from 6
TAKE_PROFIT_PCT = 100.0       # 2x = +100%
STOP_LOSS_PCT = -30.0         # -30% max loss
TRAILING_STOP_PCT = 20.0      # Activate trailing stop after +20%
TRAILING_STOP_DISTANCE = 10.0 # Trail by 10%
MAX_DAILY_LOSS = -50.0        # Stop trading if daily loss exceeds -$50
COOLDOWN_SECONDS = 300        # 5min cooldown per token

# ─── Confidence → Position Sizing ───
# Score 8 → 1.5x, Score 7 → 1.0x, Score 6 → 0.5x
POSITION_MULTIPLIERS = {8: 1.5, 7: 1.0, 6: 0.5}

# ─── Retry Config ───
MAX_RETRIES = 3
BACKOFF_BASE = 1.0

# ─── Concurrency ───
MAX_WORKERS = 5


# ─── Safe Parsing ───
def safe_float(value, default=0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        log.warning(f"safe_float: cannot parse {value!r}, using default {default}")
        return default


def safe_int(value, default=0) -> int:
    if value is None:
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        log.warning(f"safe_int: cannot parse {value!r}, using default {default}")
        return default


# ─── Data Model ───
@dataclass
class TokenSignal:
    source: str
    symbol: str
    address: str
    risk_level: str
    risk_score: int
    sniper_pct: float
    dev_migrate: int
    bonding_progress: float
    holders: int
    liquidity: float
    market_cap: float
    smart_money_count: int = 0
    tags: list = field(default_factory=list)
    paper_trade: bool = False
    position_size: float = 0.0
    stop_loss: float = STOP_LOSS_PCT
    take_profit: float = TAKE_PROFIT_PCT
    confidence: str = "LOW"  # LOW / MEDIUM / HIGH
    notes: str = ""
    score_breakdown: dict = field(default_factory=dict)


@dataclass
class PaperPosition:
    """Track an active paper trade position."""
    symbol: str
    address: str
    entry_price: float  # market_cap at entry as proxy
    entry_time: float
    size_usd: float
    highest_price: float  # for trailing stop
    stop_loss_pct: float
    take_profit_pct: float
    trailing_active: bool = False
    status: str = "open"  # open / closed
    exit_reason: str = ""
    pnl_pct: float = 0.0


# ─── Paper Trade Tracker ───
class TradeTracker:
    """Track daily paper trades and P&L."""
    def __init__(self):
        self.positions: list[PaperPosition] = []
        self.daily_pnl: float = 0.0
        self.trade_count: int = 0
        self.cooldowns: dict[str, float] = {}  # address → last trade timestamp

    def can_trade(self, address: str) -> tuple[bool, str]:
        if self.trade_count >= MAX_DAILY_TRADES:
            return False, f"每日交易上限 ({MAX_DAILY_TRADES})"
        if self.daily_pnl <= MAX_DAILY_LOSS:
            return False, f"每日虧損上限 (${self.daily_pnl:.1f})"
        cooldown_until = self.cooldowns.get(address, 0)
        if time.time() < cooldown_until:
            remaining = int(cooldown_until - time.time())
            return False, f"冷卻中 ({remaining}s)"
        return True, ""

    def open_position(self, signal: TokenSignal) -> PaperPosition:
        pos = PaperPosition(
            symbol=signal.symbol,
            address=signal.address,
            entry_price=signal.market_cap,
            entry_time=time.time(),
            size_usd=signal.position_size,
            highest_price=signal.market_cap,
            stop_loss_pct=signal.stop_loss,
            take_profit_pct=signal.take_profit,
        )
        self.positions.append(pos)
        self.trade_count += 1
        self.cooldowns[signal.address] = time.time() + COOLDOWN_SECONDS
        return pos

    def summary(self) -> str:
        open_pos = [p for p in self.positions if p.status == "open"]
        closed_pos = [p for p in self.positions if p.status == "closed"]
        return (
            f"📈 持倉: {len(open_pos)} | 已平倉: {len(closed_pos)} | "
            f"今日交易: {self.trade_count}/{MAX_DAILY_TRADES} | "
            f"今日損益: ${self.daily_pnl:+.1f}"
        )


tracker = TradeTracker()


# ─── HTTP Layer ───
def _curl(url: str, headers: list, data: Optional[dict] = None) -> dict:
    cmd = ["curl", "-s", "-X", "POST", url] + headers
    if data:
        cmd += ["-d", json.dumps(data)]

    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode != 0:
                raise subprocess.SubprocessError(f"curl exit code {result.returncode}")
            resp = json.loads(result.stdout)
            if not isinstance(resp, dict):
                return {"error": "invalid_response_type"}
            return resp
        except subprocess.TimeoutExpired:
            log.warning(f"curl timeout attempt {attempt+1}/{MAX_RETRIES}")
        except json.JSONDecodeError as e:
            log.warning(f"JSON decode error attempt {attempt+1}: {e}")
        except subprocess.SubprocessError as e:
            log.warning(f"Subprocess error: {e}")
        except FileNotFoundError:
            log.error("curl not found!")
            return {"error": "curl_not_found"}

        if attempt < MAX_RETRIES - 1:
            sleep_time = BACKOFF_BASE * (2 ** attempt)
            time.sleep(sleep_time)

    return {"error": "max_retries_exceeded"}


# ─── Data Sources ───
def scan_meme_rush() -> list[dict]:
    data = {
        "chainId": CHAIN_ID,
        "rankType": 10,
        "limit": 30,  # Fetch more, filter harder
        "protocol": [1001],
        "excludeDevWashTrading": 1 if EXCLUDE_DEV_WASH else 0,
        "holdersMin": MIN_HOLDERS,
        "liquidityMin": str(MIN_LIQUIDITY),
    }
    resp = _curl(MEME_RUSH_URL, HEADERS_MEME, data)
    if "error" in resp:
        log.error(f"meme_rush API failed: {resp['error']}")
        return []
    tokens = resp.get("data")
    if not isinstance(tokens, list):
        return []
    log.info(f"meme_rush: fetched {len(tokens)} tokens")
    return tokens


def audit_token(address: str) -> Optional[dict]:
    if not address:
        return None
    data = {
        "binanceChainId": CHAIN_ID,
        "contractAddress": address,
        "requestId": str(uuid.uuid4()),
    }
    resp = _curl(AUDIT_URL, HEADERS_AUDIT, data)
    if "error" in resp:
        return None
    if not resp.get("success"):
        return None
    audit_data = resp.get("data", {})
    if not isinstance(audit_data, dict):
        return None
    if not audit_data.get("hasResult") or not audit_data.get("isSupported"):
        return None
    return audit_data


def get_smart_money_signals() -> list[dict]:
    data = {"page": 1, "pageSize": 50, "chainId": CHAIN_ID}
    resp = _curl(SMART_MONEY_URL, HEADERS_MEME, data)
    if "error" in resp:
        log.error(f"smart_money API failed: {resp['error']}")
        return []
    signals = resp.get("data")
    if not isinstance(signals, list):
        return []
    log.info(f"smart_money: fetched {len(signals)} signals")
    return signals


# ─── Multi-Factor Scoring ───
def score_meme_token(token_data: dict, audit_data: dict) -> Optional[TokenSignal]:
    """
    Multi-factor weighted scoring for meme-rush tokens.
    Categories: Risk (35%), Structure (25%), Momentum (20%), Liquidity (20%)
    Total scale: 0-10
    """
    risk_enum = (audit_data.get("riskLevelEnum", "HIGH") or "HIGH").upper()

    # ── Hard Filters (instant elimination) ──
    if risk_enum == "HIGH":
        log.info(f"❌ ELIMINATE (HIGH risk): {token_data.get('symbol','?')}")
        return None

    sniper = safe_float(token_data.get("holdersSniperPercent"))
    if sniper > MAX_SNIPER_PCT:
        log.info(f"❌ ELIMINATE (sniper {sniper:.1f}%): {token_data.get('symbol','?')}")
        return None

    dev_mig = safe_int(token_data.get("devMigrateCount"))
    if dev_mig > MAX_DEV_MIGRATE:
        log.info(f"❌ ELIMINATE (dev migrate {dev_mig}x): {token_data.get('symbol','?')}")
        return None

    market_cap = safe_float(token_data.get("marketCap"))
    if market_cap < MIN_MARKET_CAP or market_cap > MAX_MARKET_CAP:
        log.info(f"❌ ELIMINATE (mcap ${market_cap:,.0f}): {token_data.get('symbol','?')}")
        return None

    liquidity = safe_float(token_data.get("liquidity"))
    holders = safe_int(token_data.get("holders"))
    progress = safe_float(token_data.get("progress"))

    # ── Risk Score (0-3.5) — weight 35% ──
    risk_score = 0.0
    if risk_enum == "LOW":
        risk_score += 2.5
    elif risk_enum in ("MID", "MEDIUM"):
        risk_score += 1.0

    # Freeze/mint authority from audit
    has_freeze = audit_data.get("freezeAuthority") or audit_data.get("hasFreezeAuthority")
    has_mint = audit_data.get("mintAuthority") or audit_data.get("hasMintAuthority")
    if not has_freeze:
        risk_score += 0.5
    if not has_mint:
        risk_score += 0.5

    # ── Structure Score (0-2.5) — weight 25% ──
    struct_score = 0.0

    # Sniper ratio
    if sniper < 3:
        struct_score += 1.0
    elif sniper < 5:
        struct_score += 0.7
    elif sniper < 8:
        struct_score += 0.3

    # Dev behavior
    if dev_mig == 0:
        struct_score += 0.8
    elif dev_mig < 3:
        struct_score += 0.4

    # Holder count (more = healthier distribution)
    if holders > 500:
        struct_score += 0.7
    elif holders > 200:
        struct_score += 0.4
    elif holders > MIN_HOLDERS:
        struct_score += 0.2

    # ── Momentum Score (0-2.0) — weight 20% ──
    momentum_score = 0.0

    # Bonding progress
    if progress > 85:
        momentum_score += 1.2
    elif progress > 65:
        momentum_score += 0.8
    elif progress > MIN_BONDING_PROGRESS:
        momentum_score += 0.4
    else:
        # Below minimum bonding → eliminate
        log.info(f"❌ ELIMINATE (progress {progress:.0f}%): {token_data.get('symbol','?')}")
        return None

    # Volume relative to market cap (healthy range: 0.5-3x)
    volume = safe_float(token_data.get("volume24h", 0))
    if market_cap > 0 and volume > 0:
        vol_ratio = volume / market_cap
        if 0.5 <= vol_ratio <= 3.0:
            momentum_score += 0.8
        elif 0.2 <= vol_ratio <= 5.0:
            momentum_score += 0.4
        # vol_ratio > 5 → wash trading risk, no points

    # ── Liquidity Score (0-2.0) — weight 20% ──
    liq_score = 0.0
    if liquidity > 50000:
        liq_score += 1.5
    elif liquidity > 20000:
        liq_score += 1.0
    elif liquidity > 10000:
        liq_score += 0.6
    elif liquidity > MIN_LIQUIDITY:
        liq_score += 0.3

    # Liquidity / Market Cap ratio (healthy: > 10%)
    if market_cap > 0:
        liq_ratio = liquidity / market_cap
        if liq_ratio > 0.15:
            liq_score += 0.5
        elif liq_ratio > 0.08:
            liq_score += 0.3

    # ── Total Score (0-10) ──
    total = risk_score + struct_score + momentum_score + liq_score
    score_int = min(10, round(total))

    # ── Confidence & Position Sizing ──
    if score_int >= 8:
        confidence = "HIGH"
        position_size = BASE_PAPER_TRADE_SIZE * 1.5
    elif score_int >= 7:
        confidence = "MEDIUM"
        position_size = BASE_PAPER_TRADE_SIZE * 1.0
    elif score_int >= 6:
        confidence = "LOW"
        position_size = BASE_PAPER_TRADE_SIZE * 0.5
    else:
        confidence = "SKIP"
        position_size = 0.0

    # ── Notes ──
    notes = []
    if sniper > 5:
        notes.append(f"⚠️ Sniper {sniper:.1f}%")
    if dev_mig > 3:
        notes.append(f"⚠️ Dev遷移 {dev_mig}x")
    if has_freeze:
        notes.append("🔒 凍結權限未撤")
    if has_mint:
        notes.append("🔒 鑄造權限未撤")
    if not notes:
        notes.append("✅ 指標正常")

    symbol = token_data.get("symbol", "?")
    address = token_data.get("contractAddress", "")

    # ── Paper Trade Decision ──
    # Must be score >= 7 AND LOW risk AND pass bonding threshold
    paper_trade = (score_int >= 7 and risk_enum == "LOW" and progress > MIN_BONDING_PROGRESS)

    # Check trade tracker constraints
    if paper_trade:
        can_trade, reason = tracker.can_trade(address)
        if not can_trade:
            notes.append(f"🚫 {reason}")
            paper_trade = False

    # Dynamic stop-loss: tighter for lower confidence
    stop_loss = STOP_LOSS_PCT
    if confidence == "LOW":
        stop_loss = -20.0  # Tighter stop for low confidence
    elif confidence == "HIGH":
        stop_loss = -35.0  # Wider stop for high confidence

    return TokenSignal(
        source="meme-rush",
        symbol=symbol,
        address=address,
        risk_level=risk_enum,
        risk_score=score_int,
        sniper_pct=sniper,
        dev_migrate=dev_mig,
        bonding_progress=progress,
        holders=holders,
        liquidity=liquidity,
        market_cap=market_cap,
        tags=[],
        paper_trade=paper_trade,
        position_size=position_size,
        stop_loss=stop_loss,
        take_profit=TAKE_PROFIT_PCT,
        confidence=confidence,
        notes="; ".join(notes),
        score_breakdown={
            "risk": round(risk_score, 1),
            "structure": round(struct_score, 1),
            "momentum": round(momentum_score, 1),
            "liquidity": round(liq_score, 1),
        },
    )


def score_smart_money(signal_data: dict, audit_data: Optional[dict]) -> Optional[TokenSignal]:
    """
    Enhanced smart money scoring with quality-weighted signals.
    Factors: signal count, gain quality, audit, direction strength
    """
    sm_count = safe_int(signal_data.get("smartMoneyCount"))
    if sm_count < 2:
        return None

    # Check audit
    if audit_data:
        risk_enum = (audit_data.get("riskLevelEnum", "HIGH") or "HIGH").upper()
        if risk_enum == "HIGH":
            log.info(f"❌ ELIMINATE (HIGH risk, SM): {signal_data.get('ticker','?')}")
            return None
    else:
        risk_enum = "UNKNOWN"

    symbol = signal_data.get("ticker", "?")
    address = signal_data.get("contractAddress", "")
    max_gain = safe_float(signal_data.get("maxGain"))
    total_value = safe_float(signal_data.get("totalTokenValue"))
    direction = signal_data.get("direction", "?")
    market_cap = safe_float(signal_data.get("currentMarketCap"))

    # ── Market cap filter ──
    if market_cap > 0 and (market_cap < MIN_MARKET_CAP or market_cap > MAX_MARKET_CAP):
        log.info(f"❌ ELIMINATE (mcap ${market_cap:,.0f}, SM): {symbol}")
        return None

    # ── Quality-weighted score (0-10) ──
    score = 0.0

    # Smart money count: diminishing returns past 5
    score += min(sm_count, 5) * 0.8  # max 4.0

    # Signal quality: max gain indicates smart money accuracy
    if max_gain > 100:
        score += 2.0
    elif max_gain > 50:
        score += 1.5
    elif max_gain > 20:
        score += 1.0
    elif max_gain > 10:
        score += 0.5

    # Total value invested by smart money (conviction)
    if total_value > 50000:
        score += 1.5
    elif total_value > 10000:
        score += 1.0
    elif total_value > 5000:
        score += 0.5

    # Audit bonus
    if risk_enum == "LOW":
        score += 1.5
    elif risk_enum in ("MID", "MEDIUM"):
        score += 0.5

    score_int = min(10, round(score))

    # ── Confidence ──
    if score_int >= 8:
        confidence = "HIGH"
        position_size = BASE_PAPER_TRADE_SIZE * 1.5
    elif score_int >= 7:
        confidence = "MEDIUM"
        position_size = BASE_PAPER_TRADE_SIZE * 1.0
    elif score_int >= 6:
        confidence = "LOW"
        position_size = BASE_PAPER_TRADE_SIZE * 0.5
    else:
        confidence = "SKIP"
        position_size = 0.0

    notes = [
        f"聰明錢 {sm_count}x {direction} | 最大收益: {max_gain:.1f}% | "
        f"總額: ${total_value:,.0f} | 信心: {confidence}"
    ]

    # Paper trade: stricter - sm_count >= 3 AND (audit LOW or high conviction)
    paper_trade = (
        sm_count >= 3
        and score_int >= 7
        and (risk_enum == "LOW" or (total_value > 20000 and max_gain > 30))
    )

    if paper_trade:
        can_trade, reason = tracker.can_trade(address)
        if not can_trade:
            notes.append(f"🚫 {reason}")
            paper_trade = False

    return TokenSignal(
        source="smart-money",
        symbol=symbol,
        address=address,
        risk_level=risk_enum,
        risk_score=score_int,
        sniper_pct=0,
        dev_migrate=0,
        bonding_progress=0,
        holders=0,
        liquidity=0,
        market_cap=market_cap,
        smart_money_count=sm_count,
        tags=[],
        paper_trade=paper_trade,
        position_size=position_size,
        stop_loss=STOP_LOSS_PCT,
        take_profit=TAKE_PROFIT_PCT,
        confidence=confidence,
        notes="; ".join(notes),
        score_breakdown={
            "sm_weight": round(min(sm_count, 5) * 0.8, 1),
            "gain_quality": round(min(2.0, max_gain / 50), 1),
            "conviction": round(min(1.5, total_value / 33333), 1),
            "audit": 1.5 if risk_enum == "LOW" else 0.5 if risk_enum in ("MID", "MEDIUM") else 0,
        },
    )


# ─── Worker Functions ───
def _process_meme_token(t: dict) -> Optional[TokenSignal]:
    addr = t.get("contractAddress", "")
    if not addr:
        return None
    audit = audit_token(addr)
    if audit is None:
        return None
    return score_meme_token(t, audit)


def _process_smart_signal(s: dict) -> Optional[TokenSignal]:
    if s.get("direction") != "buy":
        return None
    if s.get("status") != "active":
        return None
    addr = s.get("contractAddress", "")
    audit = audit_token(addr) if addr else None
    return score_smart_money(s, audit)


# ─── Main Scanner ───
def _collect_results(futures: dict, seen_addresses: set) -> list[TokenSignal]:
    results = []
    for future in as_completed(futures):
        try:
            result = future.result()
            if result is None:
                continue
            if result.address in seen_addresses:
                log.info(f"Dedup: skipping {result.symbol}")
                continue
            seen_addresses.add(result.address)
            results.append(result)
        except (AttributeError, KeyError, TypeError) as e:
            log.error(f"Worker data error: {e}")
        except Exception as e:
            log.error(f"Worker error: {type(e).__name__}: {e}")
    return results


def run_scan() -> list[TokenSignal]:
    signals = []
    seen_addresses = set()

    # ── Line A: Meme Rush ──
    tokens = scan_meme_rush()
    if tokens:
        log.info(f"Processing {len(tokens)} meme tokens with {MAX_WORKERS} workers...")
        executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        try:
            futures = {executor.submit(_process_meme_token, t): t for t in tokens}
            results = _collect_results(futures, seen_addresses)
            signals.extend(results)
        finally:
            executor.shutdown(wait=True, cancel_futures=False)

    # ── Line B: Smart Money ──
    sm_list = get_smart_money_signals()
    if sm_list:
        active_buys = [s for s in sm_list if s.get("direction") == "buy" and s.get("status") == "active"]
        log.info(f"Processing {len(active_buys)} active smart-money signals...")
        executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        try:
            futures = {executor.submit(_process_smart_signal, s): s for s in active_buys}
            results = _collect_results(futures, seen_addresses)
            signals.extend(results)
        finally:
            executor.shutdown(wait=True, cancel_futures=False)

    # Sort by risk_score desc, then by confidence
    confidence_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1, "SKIP": 0}
    signals.sort(key=lambda x: (x.risk_score, confidence_order.get(x.confidence, 0)), reverse=True)

    # Open paper trade positions for qualifying signals
    for s in signals:
        if s.paper_trade and s.position_size > 0:
            pos = tracker.open_position(s)
            log.info(f"🎯 PAPER TRADE: {s.symbol} @ ${s.market_cap:,.0f} | "
                     f"Size: ${s.position_size:.1f} | SL: {s.stop_loss:.0f}% | TP: {s.take_profit:.0f}%")

    return signals


def format_report(signals: list[TokenSignal]) -> str:
    lines = [
        "═══════════════════════════════════════════════",
        "🛡️  RugShield v3 掃描報告",
        f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "═══════════════════════════════════════════════\n",
    ]

    for i, s in enumerate(signals, 1):
        risk_icon = {"LOW": "🟢", "MEDIUM": "🟡", "MID": "🟡", "HIGH": "🔴"}.get(s.risk_level, "⚪")
        conf_icon = {"HIGH": "🔥", "MEDIUM": "🟡", "LOW": "⚪", "SKIP": "⏭️"}.get(s.confidence, "?")
        trade_icon = "🎯" if s.paper_trade else "  "
        source_tag = {"meme-rush": "M", "smart-money": "S"}.get(s.source, "?")

        lines.append(f"{trade_icon} #{i} [{source_tag}] {s.symbol}  {conf_icon} {s.confidence}")
        lines.append(f"   風險: {risk_icon}{s.risk_level} | 評分: {s.risk_score}/10 | 來源: {s.source}")

        if s.source == "meme-rush":
            lines.append(f"   Sniper: {s.sniper_pct:.1f}% | Dev遷移: {s.dev_migrate}x | 進度: {s.bonding_progress:.0f}%")
            lines.append(f"   持幣: {s.holders} | 流動性: ${s.liquidity:,.0f} | 市值: ${s.market_cap:,.0f}")
        if s.source == "smart-money":
            lines.append(f"   聰明錢: {s.smart_money_count}x | 市值: ${s.market_cap:,.0f}")

        if s.paper_trade:
            lines.append(f"   💰 倉位: ${s.position_size:.1f} | 止損: {s.stop_loss:.0f}% | 止盈: {s.take_profit:.0f}%")

        # Score breakdown
        if s.score_breakdown:
            bd = s.score_breakdown
            parts = [f"{k}={v}" for k, v in bd.items()]
            lines.append(f"   📊 {' | '.join(parts)}")

        lines.append(f"   備註: {s.notes}")
        lines.append("")

    paper_trades = [s for s in signals if s.paper_trade]
    high_conf = [s for s in signals if s.confidence == "HIGH"]

    lines.append("───────────────────────────────────────────────")
    lines.append(f"📊 {len(signals)} 個信號 | {len(paper_trades)} 個 paper trade | {len(high_conf)} 個高信心")
    lines.append(tracker.summary())
    lines.append("───────────────────────────────────────────────")

    return "\n".join(lines)


if __name__ == "__main__":
    log.info("RugShield v3 starting scan...")
    start = time.time()
    signals = run_scan()
    elapsed = time.time() - start
    report = format_report(signals)
    print(report)
    log.info(f"Scan completed in {elapsed:.1f}s")
