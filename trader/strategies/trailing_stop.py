"""
Trailing Stop Strategy
======================
Entry   : Buy INITIAL_SHARES at market on first run.
Floor   : Sell all if price drops STOP_LOSS_PCT below entry price.
Trailing: Once price rises TRAIL_ACTIVATE_PCT above entry, the floor
          moves to TRAIL_OFFSET_PCT below the running peak (never down).
Ladder  : If price falls LADDER_L1_DROP from entry, buy LADDER_L1_SHARES.
          If price falls LADDER_L2_DROP from entry, buy LADDER_L2_SHARES.
          Each ladder level fires only once per position.

All caps constants below are the tunable risk parameters.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from typing import Set

from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.trading.requests import MarketOrderRequest
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestTradeRequest

from trader.strategies.base import BaseStrategy

# ── Risk / strategy parameters — tune these freely ────────────────────────

INITIAL_SHARES     = 10     # shares to buy on first entry

# Stop loss: absolute floor — maximum loss you're willing to take
STOP_LOSS_PCT      = 0.10   # 10%  drop from entry → sell everything

# Trailing stop activation: how much the stock must gain before the
# floor starts moving up
TRAIL_ACTIVATE_PCT = 0.10   # 10%  gain from entry activates the trail

# Trailing stop offset: floor sits this far below the running peak
TRAIL_OFFSET_PCT   = 0.05   # 5%   below peak price

# Ladder level 1: dip buy on moderate drop
LADDER_L1_DROP     = 0.20   # 20%  drop from entry
LADDER_L1_SHARES   = 20     # shares to add at level 1

# Ladder level 2: dip buy on deeper drop
LADDER_L2_DROP     = 0.30   # 30%  drop from entry
LADDER_L2_SHARES   = 10     # shares to add at level 2

# ──────────────────────────────────────────────────────────────────────────


@dataclass
class PositionState:
    entry_price: float
    shares: int
    stop_loss: float      # current floor — moves up, never down
    peak_price: float     # highest closing price seen since entry
    ladder_hit: Set[int] = field(default_factory=set)   # {1} and/or {2}


class TrailingStopStrategy(BaseStrategy):
    """Stateful per-symbol trailing stop with ladder entries."""

    def __init__(self, trading: TradingClient, data: StockHistoricalDataClient):
        super().__init__(trading, data)
        self._positions: dict[str, PositionState] = {}

    # ── Market data ───────────────────────────────────────────────────────

    def _current_price(self, symbol: str) -> float:
        req = StockLatestTradeRequest(symbol_or_symbols=symbol)
        return float(self.data.get_stock_latest_trade(req)[symbol].price)

    # ── Signal evaluation ─────────────────────────────────────────────────

    def evaluate(self, symbol: str) -> str:
        price = self._current_price(symbol)
        state = self._positions.get(symbol)

        # ── No local state — check broker for an existing position ─────
        if state is None:
            try:
                pos = self.trading.get_open_position(symbol)
                entry  = float(pos.avg_entry_price)
                shares = int(float(pos.qty))
                state  = PositionState(
                    entry_price=entry,
                    shares=shares,
                    stop_loss=entry * (1 - STOP_LOSS_PCT),
                    peak_price=entry,
                )
                self._positions[symbol] = state
                print(
                    f"[{symbol}] Restored existing broker position: "
                    f"{shares} shares @ ${entry:.2f}  |  stop ${state.stop_loss:.2f}"
                )
            except Exception:
                return "entry"   # no position anywhere — enter now

        drop_pct = (state.entry_price - price) / state.entry_price
        gain_pct = (price - state.entry_price) / state.entry_price

        # Priority 1 — stop loss (exit immediately)
        if price <= state.stop_loss:
            return "stop_loss"

        # Priority 2 — ladder buys (only while below entry; each level once)
        if drop_pct >= LADDER_L2_DROP and 2 not in state.ladder_hit:
            return "ladder_2"
        if drop_pct >= LADDER_L1_DROP and 1 not in state.ladder_hit:
            return "ladder_1"

        # Priority 3 — update trailing floor (no order placed)
        if price > state.peak_price:
            state.peak_price = price

        if gain_pct >= TRAIL_ACTIVATE_PCT:
            candidate_floor = state.peak_price * (1 - TRAIL_OFFSET_PCT)
            if candidate_floor > state.stop_loss:
                old_stop = state.stop_loss
                state.stop_loss = candidate_floor
                print(
                    f"[{symbol}] Trailing floor raised: "
                    f"${old_stop:.2f} → ${state.stop_loss:.2f}  "
                    f"(peak ${state.peak_price:.2f}  |  "
                    f"+{gain_pct*100:.1f}% from entry)"
                )

        return "hold"

    # ── Order execution ───────────────────────────────────────────────────

    def execute(self, symbol: str, signal: str) -> None:
        if signal == "hold":
            return

        price = self._current_price(symbol)

        if signal == "entry":
            stop = price * (1 - STOP_LOSS_PCT)
            order = self._submit(symbol, OrderSide.BUY, INITIAL_SHARES)
            state = PositionState(
                entry_price=price,
                shares=INITIAL_SHARES,
                stop_loss=stop,
                peak_price=price,
            )
            self._positions[symbol] = state
            self._print_summary(
                order, price, "Initial entry",
                extra={
                    "Stop Loss Set": f"${stop:.2f}  (entry - {STOP_LOSS_PCT*100:.0f}%)",
                    "Trail Activates At": f"${price * (1 + TRAIL_ACTIVATE_PCT):.2f}  (+{TRAIL_ACTIVATE_PCT*100:.0f}%)",
                    "Total Held After": f"{state.shares} shares",
                },
            )

        elif signal == "stop_loss":
            state = self._positions[symbol]
            order = self._submit(symbol, OrderSide.SELL, state.shares)
            pnl_pct = (price - state.entry_price) / state.entry_price * 100
            self._print_summary(
                order, price, "Stop loss triggered",
                extra={
                    "Entry Price": f"${state.entry_price:.2f}",
                    "Exit Price": f"${price:.2f}",
                    "P&L": f"{pnl_pct:+.1f}%",
                    "Shares Sold": str(state.shares),
                },
            )
            del self._positions[symbol]

        elif signal in ("ladder_1", "ladder_2"):
            state = self._positions[symbol]
            level  = int(signal[-1])
            shares = LADDER_L1_SHARES if level == 1 else LADDER_L2_SHARES
            drop_pct = (LADDER_L1_DROP if level == 1 else LADDER_L2_DROP) * 100
            order = self._submit(symbol, OrderSide.BUY, shares)
            state.shares += shares
            state.ladder_hit.add(level)
            self._print_summary(
                order, price, f"Ladder level {level}  ({drop_pct:.0f}% dip buy)",
                extra={
                    "Entry Price": f"${state.entry_price:.2f}",
                    "Current Dip": f"-{(state.entry_price - price) / state.entry_price * 100:.1f}%",
                    "Shares Added": str(shares),
                    "Total Held After": f"{state.shares} shares",
                    "Stop Loss": f"${state.stop_loss:.2f}",
                },
            )

    # ── Helpers ───────────────────────────────────────────────────────────

    def _submit(self, symbol: str, side: OrderSide, qty: int):
        return self.trading.submit_order(
            MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=side,
                time_in_force=TimeInForce.DAY,
            )
        )

    def _print_summary(self, order, est_price: float, reason: str, extra: dict | None = None) -> None:
        side      = order.side.value.upper()
        qty       = int(float(order.qty))
        est_total = qty * est_price

        bar = "═" * 54
        print(f"\n{bar}")
        print(f"  {'ORDER SUMMARY':^50}")
        print(bar)
        print(f"  {'Symbol':<22}: {order.symbol}")
        print(f"  {'Action':<22}: {side}")
        print(f"  {'Shares':<22}: {qty}")
        print(f"  {'Est. Price':<22}: ${est_price:.2f}")
        print(f"  {'Est. Total':<22}: ${est_total:,.2f}")
        print(f"  {'Reason':<22}: {reason}")
        print(f"  {'Order ID':<22}: {order.id}")
        print(f"  {'Status':<22}: {order.status.value}")
        if extra:
            print(f"  {'─'*50}")
            for k, v in extra.items():
                print(f"  {k:<22}: {v}")
        print(bar)
        sys.stdout.flush()
