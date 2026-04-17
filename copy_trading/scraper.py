"""
Capitol Trades scraper.
Fetches recent trades for each tracked politician and returns structured records.
Capitol Trades renders HTML server-side (SSR), so plain requests + BeautifulSoup works.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import List, Optional

import requests
from bs4 import BeautifulSoup

import copy_trading.config as cfg


@dataclass
class CapitolTrade:
    trade_id: str           # deterministic hash used for dedup
    politician_id: str
    politician_name: str
    ticker: str             # e.g. "NVDA"
    asset_type: str         # "stock" | "call" | "put" | "option"
    action: str             # "buy" | "sell"
    size_label: str         # e.g. "$100K–250K"
    traded_date: date
    filed_date: date
    owner: str              # "Self" | "Spouse" | "Undisclosed"


def _make_id(politician_id: str, ticker: str, action: str, traded_date: date) -> str:
    raw = f"{politician_id}|{ticker}|{action}|{traded_date}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _parse_date(text: str) -> Optional[date]:
    text = text.strip()
    for fmt in ("%d %b %Y", "%b %d, %Y", "%Y-%m-%d", "%d %b '%y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _normalise_asset(raw: str) -> str:
    r = raw.lower().strip()
    if "call" in r:
        return "call"
    if "put" in r:
        return "put"
    if "option" in r:
        return "option"
    return "stock"


def _normalise_action(raw: str) -> str:
    r = raw.lower().strip()
    if "buy" in r or "purchase" in r:
        return "buy"
    if "sell" in r or "sale" in r:
        return "sell"
    return raw.lower()


def _fetch_html(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=cfg.HEADERS, timeout=cfg.REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp.text
    except Exception as exc:
        print(f"[Scraper] Failed to fetch {url}: {exc}")
        return None


def _parse_trades_page(html: str, politician_id: str, politician_name: str) -> List[CapitolTrade]:
    """Parse the HTML trade table from a Capitol Trades trades page."""
    soup    = BeautifulSoup(html, "html.parser")
    trades: List[CapitolTrade] = []

    # The trade table uses <tr> rows; each row represents one trade.
    # We scan all rows and pick those that contain a ticker link.
    rows = soup.select("table tbody tr") or soup.select("tr")

    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) < 4:
            continue

        text = [c.get_text(separator=" ", strip=True) for c in cells]

        # Try to find ticker: look for a <span> or <a> with a known pattern
        ticker = None
        for cell in cells:
            # Ticker spans often carry class "issuer-ticker" or similar
            t = cell.find(class_=lambda c: c and "ticker" in c.lower()) if cell else None
            if t:
                ticker = t.get_text(strip=True).upper().split(":")[0]
                break
        if not ticker:
            # Fallback: look for any short all-caps token
            for chunk in text:
                for token in chunk.split():
                    if token.isupper() and 1 < len(token) <= 5 and token.isalpha():
                        ticker = token
                        break
                if ticker:
                    break
        if not ticker:
            continue

        # Asset type, action, dates, size — positional heuristics
        full_text = " ".join(text)
        asset_type = "stock"
        for chunk in text:
            low = chunk.lower()
            if any(k in low for k in ("call", "put", "option")):
                asset_type = _normalise_asset(chunk)
                break

        action = None
        for chunk in text:
            low = chunk.lower()
            if any(k in low for k in ("buy", "purchase", "sold", "sale", "sell")):
                action = _normalise_action(chunk)
                break
        if not action:
            continue

        # Dates: look for dd mon yyyy patterns
        traded_date: Optional[date] = None
        filed_date:  Optional[date] = None
        import re
        date_pattern = re.compile(
            r"\b(\d{1,2}\s+\w{3,9}\s+\d{4}|\w{3}\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2})\b"
        )
        found_dates = [_parse_date(m) for m in date_pattern.findall(full_text) if _parse_date(m)]
        found_dates = [d for d in found_dates if d is not None]
        found_dates.sort()
        if found_dates:
            traded_date = found_dates[0]
            filed_date  = found_dates[-1] if len(found_dates) > 1 else found_dates[0]

        if not traded_date:
            continue

        # Size label
        size_label = ""
        for chunk in text:
            if "$" in chunk and ("K" in chunk or "M" in chunk or "–" in chunk):
                size_label = chunk.strip()
                break

        # Owner
        owner = "Self"
        for chunk in text:
            low = chunk.lower()
            if "spouse" in low:
                owner = "Spouse"
            elif "undisclosed" in low:
                owner = "Undisclosed"

        trade_id = _make_id(politician_id, ticker, action, traded_date)
        trades.append(CapitolTrade(
            trade_id       = trade_id,
            politician_id  = politician_id,
            politician_name= politician_name,
            ticker         = ticker,
            asset_type     = asset_type,
            action         = action,
            size_label     = size_label,
            traded_date    = traded_date,
            filed_date     = filed_date or traded_date,
            owner          = owner,
        ))

    return trades


def fetch_recent_trades(max_age_days: int = cfg.MAX_TRADE_AGE_DAYS) -> List[CapitolTrade]:
    """
    Fetch trades for all tracked politicians and return those filed within
    max_age_days. Respects REQUEST_DELAY between network calls.
    """
    cutoff = date.today() - timedelta(days=max_age_days)
    all_trades: List[CapitolTrade] = []

    for pol_id, pol_name in cfg.POLITICIANS.items():
        url  = f"{cfg.BASE_URL}/trades?politician={pol_id}&per_page=96"
        html = _fetch_html(url)
        if not html:
            time.sleep(cfg.REQUEST_DELAY)
            continue

        trades = _parse_trades_page(html, pol_id, pol_name)
        recent = [t for t in trades if t.filed_date >= cutoff]
        print(f"[Scraper] {pol_name}: {len(trades)} trades parsed, {len(recent)} within {max_age_days}d")
        all_trades.extend(recent)
        time.sleep(cfg.REQUEST_DELAY)

    # Sort oldest → newest so we execute in chronological order
    all_trades.sort(key=lambda t: t.traded_date)
    return all_trades
