"""
Copy Trading — single-run entry point.
Designed to be called by the scheduler every 30 minutes during market hours.
Each call: scrape Capitol Trades → filter new trades → execute → persist state.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime

import config as alpaca_config
from trader.client import get_trading_client, get_data_client

import copy_trading.config as cfg
import copy_trading.state as state
from copy_trading.scraper import fetch_recent_trades
from copy_trading.executor import execute_trade


def main() -> None:
    alpaca_config.validate()

    trading = get_trading_client()
    data    = get_data_client()

    account = trading.get_account()
    now     = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    print(f"\n{'═'*58}")
    print(f"  COPY TRADING RUN  —  {now}")
    print(f"{'═'*58}")
    print(f"  Paper cash    : ${float(account.cash):>14,.2f}")
    print(f"  Tracking      : {len(cfg.POLITICIANS)} politicians")
    print(f"  Last checked  : {state.last_checked() or 'never'}")
    print(f"{'═'*58}\n")

    trades = fetch_recent_trades(max_age_days=cfg.MAX_TRADE_AGE_DAYS)
    new_trades = [t for t in trades if not state.already_executed(t.trade_id)]

    print(f"\n[CopyTrader] {len(trades)} recent trades found, {len(new_trades)} new to execute.\n")

    executed = 0
    for trade in new_trades:
        success = execute_trade(trade, trading, data)
        if success:
            state.mark_executed(trade.trade_id)
            executed += 1

    state.update_last_checked()
    print(f"\n[CopyTrader] Done — {executed}/{len(new_trades)} trades executed.")


if __name__ == "__main__":
    main()
