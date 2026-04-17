"""
Trailing Stop Bot — entry point.
  python main.py            → continuous polling loop
  python main.py --once     → single evaluation pass (used by scheduler)
"""

import sys
import config
from trader.client import get_trading_client, get_data_client
from trader.monitor import MarketMonitor
from trader.strategies.trailing_stop import (
    TrailingStopStrategy,
    INITIAL_SHARES,
    STOP_LOSS_PCT,
    TRAIL_ACTIVATE_PCT,
    TRAIL_OFFSET_PCT,
    LADDER_L0_DROP, LADDER_L0_SHARES,
    LADDER_L1_DROP, LADDER_L1_SHARES,
    LADDER_L2_DROP, LADDER_L2_SHARES,
    LADDER_L3_DROP, LADDER_L3_SHARES,
    LADDER_L4_DROP, LADDER_L4_SHARES,
    ENABLE_DEEP_LADDER,
)

WATCHLIST     = ["TSLA"]
POLL_INTERVAL = 60   # seconds between checks in continuous mode


def main(once: bool = False) -> None:
    config.validate()

    trading = get_trading_client()
    data    = get_data_client()
    account = trading.get_account()

    print(f"\n{'═'*54}")
    print(f"  TRAILING STOP BOT  {'(one-shot)' if once else '(continuous)'}")
    print(f"{'═'*54}")
    print(f"  Paper cash    : ${float(account.cash):>12,.2f}")
    print(f"  Equity        : ${float(account.equity):>12,.2f}")
    print(f"  Watching      : {', '.join(WATCHLIST)}")
    if not once:
        print(f"  Poll interval : {POLL_INTERVAL}s")
    print(f"{'─'*54}")
    print(f"  Risk params:")
    print(f"    Initial shares        : {INITIAL_SHARES}")
    print(f"    Stop loss             : −{STOP_LOSS_PCT*100:.0f}%")
    print(f"    Trail activates at    : +{TRAIL_ACTIVATE_PCT*100:.0f}%")
    print(f"    Trail offset          : −{TRAIL_OFFSET_PCT*100:.0f}% below peak")
    print(f"    Ladder L0 (−{LADDER_L0_DROP*100:.0f}%)    : +{LADDER_L0_SHARES} shares")
    print(f"    Ladder L1 (−{LADDER_L1_DROP*100:.0f}%)    : +{LADDER_L1_SHARES} shares")
    print(f"    Ladder L2 (−{LADDER_L2_DROP*100:.0f}%)    : +{LADDER_L2_SHARES} shares")
    if ENABLE_DEEP_LADDER:
        print(f"    Ladder L3 (−{LADDER_L3_DROP*100:.0f}%)   : +{LADDER_L3_SHARES} shares  [DEEP]")
        print(f"    Ladder L4 (−{LADDER_L4_DROP*100:.0f}%)   : +{LADDER_L4_SHARES} shares  [DEEP]")
    print(f"{'═'*54}\n")

    monitor = MarketMonitor(symbols=WATCHLIST, interval_seconds=POLL_INTERVAL)
    monitor.add_strategy(TrailingStopStrategy(trading, data))

    if once:
        monitor.tick_once()
    else:
        monitor.start()


if __name__ == "__main__":
    once_mode = "--once" in sys.argv
    main(once=once_mode)
