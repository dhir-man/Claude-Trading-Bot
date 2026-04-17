"""
Wheel Strategy — entry point.
  python wheel_strategy/main.py --check    → 15-min evaluation pass
  python wheel_strategy/main.py --summary  → end-of-day summary report
  python wheel_strategy/main.py --reset    → wipe state and start fresh
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, time as dtime
import pytz

import config as alpaca_config
from trader.client import get_trading_client, get_data_client, get_option_data_client
from wheel_strategy.strategy import WheelStrategy
import wheel_strategy.config as cfg
import wheel_strategy.state as st


MARKET_OPEN  = dtime(9, 30)
MARKET_CLOSE = dtime(16, 0)
ET           = pytz.timezone("America/New_York")


def _is_market_hours() -> bool:
    now_et = datetime.now(ET).time()
    return MARKET_OPEN <= now_et <= MARKET_CLOSE


def main() -> None:
    mode = "--check"
    if "--summary" in sys.argv:
        mode = "--summary"
    elif "--reset" in sys.argv:
        mode = "--reset"

    if mode == "--reset":
        st.reset()
        print("[Wheel] State reset to IDLE.")
        return

    alpaca_config.validate()

    if not _is_market_hours() and mode == "--check":
        print(f"[Wheel] Market closed — skipping check.  ({datetime.now(ET).strftime('%H:%M ET')})")
        return

    trading     = get_trading_client()
    stock_data  = get_data_client()
    option_data = get_option_data_client()
    wheel       = WheelStrategy(trading, stock_data, option_data)

    account = trading.get_account()
    now_str = datetime.now(ET).strftime("%Y-%m-%d %H:%M ET")

    if mode == "--check":
        print(f"\n{'─'*54}")
        print(f"  WHEEL CHECK  {now_str}")
        print(f"  {cfg.SYMBOL}  |  cash ${float(account.cash):,.2f}  |  equity ${float(account.equity):,.2f}")
        print(f"{'─'*54}")
        wheel.check()

    elif mode == "--summary":
        wheel.daily_summary()


if __name__ == "__main__":
    main()
