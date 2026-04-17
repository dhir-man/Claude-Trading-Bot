from abc import ABC, abstractmethod
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient


class BaseStrategy(ABC):
    """
    Subclass this to define a trading strategy.
    Implement evaluate() to return a signal and execute() to place orders.
    """

    def __init__(self, trading_client: TradingClient, data_client: StockHistoricalDataClient):
        self.trading = trading_client
        self.data = data_client

    @abstractmethod
    def evaluate(self, symbol: str) -> str:
        """Return 'buy', 'sell', or 'hold'."""
        ...

    @abstractmethod
    def execute(self, symbol: str, signal: str) -> None:
        """Place the appropriate order based on the signal."""
        ...

    def run(self, symbol: str) -> None:
        signal = self.evaluate(symbol)
        print(f"[{self.__class__.__name__}] {symbol} → {signal.upper()}")
        if signal in ("buy", "sell"):
            self.execute(symbol, signal)
