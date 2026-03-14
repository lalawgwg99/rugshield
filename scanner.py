#!/usr/bin/env python3
"""
RugShield Scanner v2 - Paper Trade Mode
Fixes from triple-model review:
- Separated scoring (meme-rush vs smart-money)
- HIGH risk direct elimination
- safe_float/safe_int with try/except
- paper_trade threshold: score >= 7 AND risk == LOW
- Dedup by address
- Python logging (INFO/WARNING/ERROR)
- Retry with exponential backoff (max 3)
- Concurrent API calls (ThreadPoolExecutor, 5 workers)
- Case-insensitive enum comparison
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

# ─── Filters ───
MIN_LIQUIDITY = 3000
MIN_HOLDERS = 50
MAX_SNIPER_PCT = 10.0
MAX_DEV_MIGRATE = 10
MIN_BONDING_PROGRESS = 20
MAX_TOP10_PCT = 40.0
EXCLUDE_DEV_WASH = True

PAPER_TRADE_SIZE = 5.0
MAX_DAILY_TRADES = 6
TAKE_PROFIT_X = 2.0

# ─── Retry Config ───
MAX_RETRIES = 3
BACKOFF_BASE = 1.0  # seconds

# ─── Concurrency ───
MAX_WORKERS = 5


# ─── Safe Parsing ───
def safe_float(value, default=0.0) -> float:
    """Safely convert any value to float."""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        log.warning(f"safe_float: cannot parse {value!r}, using default {default}")
        return default


def safe_int(value, default=0) -> int:
    """Safely convert any value to int."""
    if value is None:
        return default
    try:
        return int(float(value))  # handles "123.0" strings
    except (ValueError, TypeError):
        log.warning(f"safe_int: cannot parse {value!r}, using default {default}")
        return default


# ─── Data Model ───
@dataclass
class TokenSignal:
    source: str
    symbol: str
    address: str
    risk_level: str  # LOW/MEDIUM/HIGH
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
    notes: str = ""


# ─── HTTP Layer ───
def _curl(url: str, headers: list, data: Optional[dict] = None) -> dict:
    """Execute curl with retry + exponential backoff."""
    cmd = ["curl", "-s", "-X", "POST", url] + headers
    if data:
        cmd += ["-d", json.dumps(data)]

    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)

            if result.returncode != 0:
                log.warning(f"curl exit {result.returncode} on attempt {attempt+1}/{MAX_RETRIES}")
                raise subprocess.SubprocessError(f"curl exit code {result.returncode}")

            resp = json.loads(result.stdout)

            if not isinstance(resp, dict):
                log.error(f"API returned non-dict: {type(resp)}")
                return {"error": "invalid_response_type"}

            if "error" in resp and resp.get("error"):
                log.warning(f"API error on attempt {attempt+1}: {resp['error']}")

            return resp

        except subprocess.TimeoutExpired:
            log.warning(f"curl timeout on attempt {attempt+1}/{MAX_RETRIES}")
        except json.JSONDecodeError as e:
            log.warning(f"JSON decode error on attempt {attempt+1}: {e}")
        except subprocess.SubprocessError as e:
            log.warning(f"Subprocess error: {e}")
        except FileNotFoundError:
            log.error("curl not found on system!")
            return {"error": "curl_not_found"}

        if attempt < MAX_RETRIES - 1:
            sleep_time = BACKOFF_BASE * (2 ** attempt)
            log.info(f"Retrying in {sleep_time:.1f}s...")
            time.sleep(sleep_time)

    log.error(f"All {MAX_RETRIES} attempts failed for {url[:60]}")
    return {"error": "max_retries_exceeded"}


# ─── Data Sources ───
def scan_meme_rush() -> list[dict]:
    """Line A: Scan pump.fun new tokens."""
    data = {
        "chainId": CHAIN_ID,
        "rankType": 10,
        "limit": 20,
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
        log.warning(f"meme_rush: data is {type(tokens).__name__}, expected list")
        return []

    log.info(f"meme_rush: fetched {len(tokens)} tokens")
    return tokens


def audit_token(address: str) -> Optional[dict]:
    """Run security audit. Returns None on failure."""
    if not address:
        log.warning("audit_token: empty address")
        return None

    data = {
        "binanceChainId": CHAIN_ID,
        "contractAddress": address,
        "requestId": str(uuid.uuid4()),
    }
    resp = _curl(AUDIT_URL, HEADERS_AUDIT, data)

    if "error" in resp:
        log.warning(f"audit failed for {address[:12]}...: {resp['error']}")
        return None

    if not resp.get("success"):
        log.warning(f"audit not successful for {address[:12]}...")
        return None

    audit_data = resp.get("data", {})
    if not isinstance(audit_data, dict):
        return None

    if not audit_data.get("hasResult") or not audit_data.get("isSupported"):
        log.info(f"audit: no result/supported for {address[:12]}...")
        return None

    return audit_data


def get_smart_money_signals() -> list[dict]:
    """Line B: Get smart money buy signals."""
    data = {"page": 1, "pageSize": 50, "chainId": CHAIN_ID}
    resp = _curl(SMART_MONEY_URL, HEADERS_MEME, data)

    if "error" in resp:
        log.error(f"smart_money API failed: {resp['error']}")
        return []

    signals = resp.get("data")
    if not isinstance(signals, list):
        log.warning(f"smart_money: data is {type(signals).__name__}, expected list")
        return []

    log.info(f"smart_money: fetched {len(signals)} signals")
    return signals


# ─── Scoring (Separated) ───
def score_meme_token(token_data: dict, audit_data: dict) -> Optional[TokenSignal]:
    """Score a meme-rush token. Returns None if HIGH risk or too low."""
    risk_enum = (audit_data.get("riskLevelEnum", "HIGH") or "HIGH").upper()

    # HIGH risk: direct elimination
    if risk_enum == "HIGH":
        log.info(f"ELIMINATE (HIGH risk): {token_data.get('symbol','?')}")
        return None

    score = 0

    # Audit risk (0-3)
    if risk_enum == "LOW":
        score += 3
    elif risk_enum in ("MID", "MEDIUM"):
        score += 1

    # Sniper (0-2)
    sniper = safe_float(token_data.get("holdersSniperPercent"))
    if sniper < 5:
        score += 2
    elif sniper < 10:
        score += 1

    # Dev behavior (0-1)
    dev_mig = safe_int(token_data.get("devMigrateCount"))
    if dev_mig < 5:
        score += 1

    # Bonding progress (0-2)
    progress = safe_float(token_data.get("progress"))
    if progress > 80:
        score += 2
    elif progress > 50:
        score += 1

    symbol = token_data.get("symbol", "?")
    address = token_data.get("contractAddress", "")

    # Notes
    notes = []
    if sniper > 20:
        notes.append(f"⚠️ Sniper 高佔比 {sniper:.1f}%")
    if dev_mig > 20:
        notes.append(f"⚠️ Serial 發幣者 ({dev_mig}x)")
    if sniper > MAX_SNIPER_PCT:
        notes.append(f"Sniper 超標 ({sniper:.1f}%)")
    if not notes:
        notes.append("指標正常")

    # Paper trade: score >= 7 AND risk == LOW
    paper_trade = (score >= 7 and risk_enum == "LOW" and progress > MIN_BONDING_PROGRESS)

    return TokenSignal(
        source="meme-rush",
        symbol=symbol,
        address=address,
        risk_level=risk_enum,
        risk_score=min(score, 8),
        sniper_pct=sniper,
        dev_migrate=dev_mig,
        bonding_progress=progress,
        holders=safe_int(token_data.get("holders")),
        liquidity=safe_float(token_data.get("liquidity")),
        market_cap=safe_float(token_data.get("marketCap")),
        tags=[],
        paper_trade=paper_trade,
        notes="; ".join(notes),
    )


def score_smart_money(signal_data: dict, audit_data: Optional[dict]) -> Optional[TokenSignal]:
    """Score a smart-money signal. Returns None if conditions not met."""
    sm_count = safe_int(signal_data.get("smartMoneyCount"))
    if sm_count < 2:
        return None

    # Check audit if available
    if audit_data:
        risk_enum = (audit_data.get("riskLevelEnum", "HIGH") or "HIGH").upper()
        if risk_enum == "HIGH":
            log.info(f"ELIMINATE (HIGH risk, smart-money): {signal_data.get('ticker','?')}")
            return None
    else:
        risk_enum = "UNKNOWN"

    symbol = signal_data.get("ticker", "?")
    address = signal_data.get("contractAddress", "")
    max_gain = safe_float(signal_data.get("maxGain"))
    total_value = safe_float(signal_data.get("totalTokenValue"))
    direction = signal_data.get("direction", "?")

    # Smart money score: 0-8 scale (separate from meme-rush)
    # sm_count (max 5) + max_gain bonus + audit bonus
    score = min(sm_count, 5)  # up to 5 points for smart money count
    if max_gain > 10:
        score += 1
    if max_gain > 50:
        score += 1
    if risk_enum == "LOW":
        score += 1

    notes = [f"聰明錢 {sm_count}x {direction} | 最大收益: {max_gain:.1f}% | 總額: ${total_value:,.0f}"]

    # Paper trade: sm_count >= 3 AND audit LOW
    paper_trade = (sm_count >= 3 and risk_enum == "LOW")

    return TokenSignal(
        source="smart-money",
        symbol=symbol,
        address=address,
        risk_level=risk_enum,
        risk_score=min(score, 8),
        sniper_pct=0,
        dev_migrate=0,
        bonding_progress=0,
        holders=0,
        liquidity=0,
        market_cap=safe_float(signal_data.get("currentMarketCap")),
        smart_money_count=sm_count,
        tags=[],
        paper_trade=paper_trade,
        notes="; ".join(notes),
    )


# ─── Worker Functions ───
def _process_meme_token(t: dict) -> Optional[TokenSignal]:
    """Process a single meme token (for concurrent execution)."""
    addr = t.get("contractAddress", "")
    if not addr:
        return None
    audit = audit_token(addr)
    if audit is None:
        return None
    return score_meme_token(t, audit)


def _process_smart_signal(s: dict) -> Optional[TokenSignal]:
    """Process a single smart-money signal."""
    if s.get("direction") != "buy":
        return None
    if s.get("status") != "active":
        return None

    addr = s.get("contractAddress", "")
    audit = audit_token(addr) if addr else None
    return score_smart_money(s, audit)


# ─── Main Scanner ───
def _collect_results(futures: dict, seen_addresses: set) -> list[TokenSignal]:
    """Collect results from futures with dedup. Does NOT manage executor lifecycle."""
    results = []
    for future in as_completed(futures):
        try:
            result = future.result()
            if result is None:
                continue
            if result.address in seen_addresses:
                log.info(f"Dedup: skipping {result.symbol} (already seen)")
                continue
            seen_addresses.add(result.address)
            results.append(result)
        except (AttributeError, KeyError, TypeError) as e:
            log.error(f"Worker data error: {e}")
        except Exception as e:
            log.error(f"Worker unexpected error: {type(e).__name__}: {e}")
    return results


def run_scan() -> list[TokenSignal]:
    """Run full scan with concurrent processing + dedup."""
    signals = []
    seen_addresses = set()

    # ── Line A: Meme Rush (concurrent) ──
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

    # ── Line B: Smart Money (concurrent) ──
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

    # Sort by risk_score desc
    signals.sort(key=lambda x: x.risk_score, reverse=True)
    return signals


def format_report(signals: list[TokenSignal]) -> str:
    """Format scan results."""
    lines = ["🔍 RugShield v2 掃描報告\n"]

    for i, s in enumerate(signals, 1):
        risk_icon = {"LOW": "🟢", "MEDIUM": "🟡", "MID": "🟡", "HIGH": "🔴"}.get(s.risk_level, "⚪")
        trade_icon = "🎯" if s.paper_trade else "  "
        source_tag = {"meme-rush": "M", "smart-money": "S"}.get(s.source, "?")

        lines.append(f"{trade_icon} #{i} [{source_tag}] {s.symbol}")
        lines.append(f"   風險: {risk_icon}{s.risk_level} | 評分: {s.risk_score}/8 | 來源: {s.source}")
        if s.source == "meme-rush":
            lines.append(f"   Sniper: {s.sniper_pct:.1f}% | Dev遷移: {s.dev_migrate}x | 進度: {s.bonding_progress:.0f}%")
            lines.append(f"   持幣: {s.holders} | 流動性: ${s.liquidity:,.0f} | 市值: ${s.market_cap:,.0f}")
        if s.source == "smart-money":
            lines.append(f"   聰明錢: {s.smart_money_count}x | 市值: ${s.market_cap:,.0f}")
        lines.append(f"   備註: {s.notes}")
        lines.append("")

    paper_trades = [s for s in signals if s.paper_trade]
    lines.append(f"📊 {len(signals)} 個信號 | {len(paper_trades)} 個符合 paper trade 條件")

    return "\n".join(lines)


if __name__ == "__main__":
    log.info("RugShield v2 starting scan...")
    start = time.time()
    signals = run_scan()
    elapsed = time.time() - start
    report = format_report(signals)
    print(report)
    log.info(f"Scan completed in {elapsed:.1f}s")
