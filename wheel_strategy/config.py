"""
Wheel Strategy — tunable parameters.
Adjust these to match your risk tolerance and market conditions.
"""

# ── Target stock ───────────────────────────────────────────────────────────
SYMBOL = "TSLA"

# ── Stage 1: Cash-Secured Put ──────────────────────────────────────────────
PUT_STRIKE_OFFSET_PCT  = 0.10   # sell put this far BELOW current price (10%)
PUT_MIN_DTE            = 14     # minimum days to expiration
PUT_MAX_DTE            = 28     # maximum days to expiration
PUT_TARGET_DTE         = 21     # ideal DTE — sweet spot for theta decay
PUT_CONTRACTS          = 1      # contracts to sell (1 contract = 100 shares)

# ── Stage 2: Covered Call ──────────────────────────────────────────────────
CALL_STRIKE_OFFSET_PCT = 0.10   # sell call this far ABOVE cost basis (10%)
CALL_MIN_DTE           = 14
CALL_MAX_DTE           = 28
CALL_TARGET_DTE        = 21
CALL_CONTRACTS         = 1      # must equal PUT_CONTRACTS (own enough shares)

# ── Position management ────────────────────────────────────────────────────
EARLY_CLOSE_PROFIT_PCT = 0.50   # close contract when 50% of premium decayed
MIN_PREMIUM_PER_SHARE  = 0.50   # skip contract if premium < $0.50/share ($50/contract)
CHECK_INTERVAL_SECS    = 900    # 15 minutes — how often the monitor runs

# ── Order execution ────────────────────────────────────────────────────────
# Limit sell: place slightly below midpoint (more patient = better fill)
SELL_LIMIT_OFFSET      = 0.05   # $0.05 below midpoint when selling to open
# Limit buy: place slightly above midpoint (more aggressive = faster close)
BUY_LIMIT_OFFSET       = 0.05   # $0.05 above midpoint when buying to close

# ── Strike rounding ────────────────────────────────────────────────────────
STRIKE_ROUND_TO        = 0.50   # round target strike to nearest $0.50
