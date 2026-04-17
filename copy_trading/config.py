"""
Copy-trading configuration.
Add/remove politicians by looking up their profile URL on capitoltrades.com
and copying the ID from the path: /politicians/<ID>
"""

# ── Politicians to track ───────────────────────────────────────────────────
# { id: display_name }  — all confirmed from Capitol Trades profiles
POLITICIANS = {
    "P000197": "Nancy Pelosi",         # $185M+ tech trades; spouse Paul Pelosi
    "C001123": "Gil Cisneros",         # 1,200+ trades; widest issuer diversity
    "C001047": "Shelley Moore Capito", # 150+ trades; energy + financials
    "M001232": "April McClain Delaney",# 210+ trades; active across sectors
    "B001277": "Richard Blumenthal",   # Senate; steady volume
    "M001157": "Michael McCaul",       # Tech + defense focus
}

# ── Trade staleness gate ───────────────────────────────────────────────────
# Skip trades disclosed more than this many days ago (STOCK Act allows 45-day lag).
# Set higher to backfill older trades on first run.
MAX_TRADE_AGE_DAYS = 10

# ── Position sizing ────────────────────────────────────────────────────────
# Capitol Trades reports $ ranges, not exact sizes.
# We map each range to a share count for paper trading.
SIZE_TO_SHARES = {
    "$1K–15K":     2,
    "$15K–50K":    5,
    "$50K–100K":   10,
    "$100K–250K":  20,
    "$250K–500K":  30,
    "$500K–1M":    50,
    "$1M–5M":      75,
    "$5M–25M":     100,
    "$25M+":       150,
}
DEFAULT_SHARES = 5          # fallback when size field is missing/unrecognised

# ── Options handling ───────────────────────────────────────────────────────
# When a politician trades an option, we try to replicate it.
# If we can't find a matching contract, fall back to buying the stock instead.
OPTION_FALLBACK_TO_STOCK = True
OPTION_DTE_SEARCH_DAYS   = 60   # look for expiries within this many days from today
OPTION_CONTRACTS_PER_LEG = 1    # number of contracts to buy per option signal

# ── Scraping ───────────────────────────────────────────────────────────────
BASE_URL       = "https://www.capitoltrades.com"
REQUEST_DELAY  = 2.5    # seconds between politician scrape calls (be polite)
REQUEST_TIMEOUT = 15    # seconds

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
