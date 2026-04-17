import config
from trader.client import get_trading_client, get_data_client
from trader.monitor import MarketMonitor
from trader.strategies.trailing_stop import (
    TrailingStopStrategy,
    INITIAL_SHARES,
    STOP_LOSS_PCT,
    TRAIL_ACTIVATE_PCT,
    TRAIL_OFFSET_PCT,
    LADDER_L1_DROP, LADDER_L1_SHARES,
    LADDER_L2_DROP, LADDER_L2_SHARES,
)

# Symbols to run the trailing stop strategy on
WATCHLIST = ["TSLA"]

# How often to evaluate strategies (seconds)
POLL_INTERVAL = 60


def main():
    config.validate()

    trading = get_trading_client()
    data    = get_data_client()

    account = trading.get_account()
    print(f"\n{'═'*54}")
    print(f"  PAPER TRADING BOT  —  Trailing Stop Strategy")
    print(f"{'═'*54}")
    print(f"  Account cash  : ${float(account.cash):>12,.2f}")
    print(f"  Equity        : ${float(account.equity):>12,.2f}")
    print(f"{'─'*54}")
    print(f"  Watching      : {', '.join(WATCHLIST)}")
    print(f"  Poll interval : {POLL_INTERVAL}s")
    print(f"{'─'*54}")
    print(f"  Strategy parameters:")
    print(f"    Initial shares      : {INITIAL_SHARES}")
    print(f"    Stop loss           : -{STOP_LOSS_PCT*100:.0f}%  from entry")
    print(f"    Trail activates at  : +{TRAIL_ACTIVATE_PCT*100:.0f}%  from entry")
    print(f"    Trail offset        : -{TRAIL_OFFSET_PCT*100:.0f}%  below peak")
    print(f"    Ladder L1 ({LADDER_L1_DROP*100:.0f}% dip)  : buy {LADDER_L1_SHARES} shares")
    print(f"    Ladder L2 ({LADDER_L2_DROP*100:.0f}% dip)  : buy {LADDER_L2_SHARES} shares")
    print(f"{'═'*54}\n")

    monitor = MarketMonitor(symbols=WATCHLIST, interval_seconds=POLL_INTERVAL)
    monitor.add_strategy(TrailingStopStrategy(trading, data))
    monitor.start()


if __name__ == "__main__":
    main()
