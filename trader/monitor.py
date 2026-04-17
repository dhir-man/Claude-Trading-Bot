import time
import schedule
from typing import List
from trader.strategies.base import BaseStrategy


class MarketMonitor:
    """
    Polls each registered strategy against each watched symbol.
    Use start() for a continuous loop, or tick_once() for a single
    evaluation pass (used by scheduled one-shot runs).
    """

    def __init__(self, symbols: List[str], interval_seconds: int = 60):
        self.symbols     = symbols
        self.interval    = interval_seconds
        self.strategies: List[BaseStrategy] = []

    def add_strategy(self, strategy: BaseStrategy) -> None:
        self.strategies.append(strategy)

    def tick_once(self) -> None:
        """Single evaluation pass — suitable for cron/scheduled calls."""
        for strategy in self.strategies:
            for symbol in self.symbols:
                try:
                    strategy.run(symbol)
                except Exception as exc:
                    print(f"[Monitor] {strategy.__class__.__name__} on {symbol}: {exc}")

    def start(self) -> None:
        """Continuous polling loop — blocks until KeyboardInterrupt."""
        print(f"[Monitor] Watching {self.symbols} every {self.interval}s — Ctrl+C to stop.")
        self.tick_once()
        schedule.every(self.interval).seconds.do(self.tick_once)
        try:
            while True:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            print("[Monitor] Stopped.")
