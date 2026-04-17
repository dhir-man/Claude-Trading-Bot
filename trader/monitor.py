import time
import schedule
from typing import List
from trader.strategies.base import BaseStrategy


class MarketMonitor:
    """
    Polls each registered strategy against each watched symbol on a fixed interval.
    Swap schedule for asyncio/websocket streaming when you need real-time ticks.
    """

    def __init__(self, symbols: List[str], interval_seconds: int = 60):
        self.symbols = symbols
        self.interval = interval_seconds
        self.strategies: List[BaseStrategy] = []

    def add_strategy(self, strategy: BaseStrategy) -> None:
        self.strategies.append(strategy)

    def _tick(self) -> None:
        for strategy in self.strategies:
            for symbol in self.symbols:
                try:
                    strategy.run(symbol)
                except Exception as exc:
                    print(f"[Monitor] Error running {strategy.__class__.__name__} on {symbol}: {exc}")

    def start(self) -> None:
        print(f"[Monitor] Watching {self.symbols} every {self.interval}s — press Ctrl+C to stop.")
        self._tick()
        schedule.every(self.interval).seconds.do(self._tick)
        try:
            while True:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            print("[Monitor] Stopped.")
