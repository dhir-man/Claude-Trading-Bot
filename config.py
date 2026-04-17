import os
from dotenv import load_dotenv

load_dotenv()

ALPACA_API_KEY    = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE_URL   = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
ALPACA_STREAM_URL = os.getenv("ALPACA_STREAM_URL", "wss://stream.data.alpaca.markets/v2")

# ── Execution mode ────────────────────────────────────────────────────────
# DRY_RUN : log every intended order — nothing is placed (safe default)
# PAPER   : submit to Alpaca paper account (simulated fills, no real money)
# LIVE    : real money — deliberately raises NotImplementedError until you
#           remove the guard in trader/order_gate.py
from trader.order_gate import ExecutionMode
EXECUTION_MODE = ExecutionMode.DRY_RUN   # change to PAPER when ready to simulate


def validate():
    missing = [k for k, v in {
        "ALPACA_API_KEY": ALPACA_API_KEY,
        "ALPACA_SECRET_KEY": ALPACA_SECRET_KEY,
    }.items() if not v]
    if missing:
        raise EnvironmentError(f"Missing credentials in .env: {', '.join(missing)}")
    if EXECUTION_MODE == ExecutionMode.PAPER and "paper-api" not in ALPACA_BASE_URL:
        raise EnvironmentError(
            "EXECUTION_MODE=PAPER but ALPACA_BASE_URL does not point to paper-api. "
            "Set ALPACA_BASE_URL=https://paper-api.alpaca.markets in your .env"
        )
