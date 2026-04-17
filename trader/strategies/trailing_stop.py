"""
Trailing Stop Strategy
======================
Entry   : Buy INITIAL_SHARES at market on first run.
Floor   : Sell all if price drops STOP_LOSS_PCT below entry price.
Trailing: Once price rises TRAIL_ACTIVATE_PCT above entry, the floor
          moves to TRAIL_OFFSET_PCT below the running peak (never down).
Ladder  : Tiered dip buys as price falls from entry. Two modes:
          • Standard (default) — buys within the stop-loss band so the
            floor still protects you on continued decline.
          • Deep / aggressive (ENABLE_DEEP_LADDER=True) — larger buys at
            -20 % / -30 % drops for averaging down after major corrections.
            Requires widening STOP_LOSS_PCT beyond 30 % or the stop loss
            will fire before these levels are reached.

All-caps constants below are the tunable risk parameters.
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

# ── Core risk parameters ───────────────────────────────────────────────────

INITIAL_SHARES      = 10      # shares purchased on first entry

# Absolute floor — maximum loss you're willing to take from entry
STOP_LOSS_PCT       = 0.10    # 10 % drop from entry → sell everything

# Trailing stop: how much the stock must gain before the floor starts rising
TRAIL_ACTIVATE_PCT  = 0.10    # 10 % gain from entry activates the trail
TRAIL_OFFSET_PCT    = 0.05    # trailing floor = peak × (1 − this)  →  5 % below peak

# ── Standard ladder (within the stop-loss band) ────────────────────────────
# These fire in sequence as the stock dips from entry.
# All levels are below entry and above the stop-loss floor,
# so they buy cheaper shares while the position is still protected.

LADDER_L0_DROP      = 0.03    # 3 %  drop → quick nibble
LADDER_L0_SHARES    = 3

LADDER_L1_DROP      = 0.05    # 5 %  drop → moderate add
LADDER_L1_SHARES    = 5

LADDER_L2_DROP      = 0.08    # 8 %  drop → heavier add (near stop floor)
LADDER_L2_SHARES    = 8

# ── Deep / aggressive ladder (disabled by default) ─────────────────────────
# Enable if you want to average down aggressively after major corrections.
# ⚠ Set STOP_LOSS_PCT ≥ 0.35 before enabling, otherwise stop fires first.

ENABLE_DEEP_LADDER  = False

LADDER_L3_DROP      = 0.20    # 20 % drop → strong conviction buy
LADDER_L3_SHARES    = 20

LADDER_L4_DROP      = 0.30    # 30 % drop → max conviction buy
LADDER_L4_SHARES    = 10

# ──────────────────────────────────────────────────────────────────────────

_ALL_LEVELS = [
    (0, LADDER_L0_DROP, LADDER_L0_SHARES),
    (1, LADDER_L1_DROP, LADDER_L1_SHARES),
    (2, LADDER_L2_DROP, LADDER_L2_SHARES),
]
_DEEP_LEVELS = [
    (3, LADDER_L3_DROP, LADDER_L3_SHARES),
    (4, LADDER_L4_DROP, LADDER_L4_SHARES),
]


@dataclass
class PositionState:
    entry_price: float
    shares: int
    stop_loss: float      # current floor — moves up, never down
    peak_price: float     # highest price seen since entry
    ladder_hit: Set[int] = field(default_factory=set)


class TrailingStopStrategy(BaseStrategy):
    """Stateful per-symbol trailing stop with tiered ladder entries."""

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

        if state is None:
            try:
                pos   = self.trading.get_open_position(symbol)
                entry = float(pos.avg_entry_price)
                qty   = int(float(pos.qty))
                state = PositionState(
                    entry_price=entry,
                    shares=qty,
                    stop_loss=entry * (1 - STOP_LOSS_PCT),
                    peak_price=entry,
                )
                self._positions[symbol] = state
                print(
                    f"[{symbol}] Restored position: {qty} shares @ ${entry:.2f}  "
                    f"|  stop ${state.stop_loss:.2f}"
                )
            except Exception:
                return "entry"

        drop_pct = (state.entry_price - price) / state.entry_price
        gain_pct = (price - state.entry_price) / state.entry_price

        # Priority 1 — stop loss
        if price <= state.stop_loss:
            return "stop_loss"

        # Priority 2 — ladder levels (each fires once)
        active_levels = _ALL_LEVELS + (_DEEP_LEVELS if ENABLE_DEEP_LADDER else [])
        for level_id, drop_threshold, _ in sorted(active_levels, key=lambda x: -x[1]):
            if drop_pct >= drop_threshold and level_id not in state.ladder_hit:
                return f"ladder_{level_id}"

        # Priority 3 — update trailing floor (no order)
        if price > state.peak_price:
            state.peak_price = price

        if gain_pct >= TRAIL_ACTIVATE_PCT:
            candidate = state.peak_price * (1 - TRAIL_OFFSET_PCT)
            if candidate > state.stop_loss:
                old = state.stop_loss
                state.stop_loss = candidate
                print(
                    f"[{symbol}] Trailing floor raised: ${old:.2f} → ${state.stop_loss:.2f}"
                    f"  (peak ${state.peak_price:.2f}  |  +{gain_pct*100:.1f}%)"
                )

        return "hold"

    # ── Order execution ───────────────────────────────────────────────────

    def execute(self, symbol: str, signal: str) -> None:
        if signal == "hold":
            return

        price = self._current_price(symbol)

        if signal == "entry":
            stop  = price * (1 - STOP_LOSS_PCT)
            order = self._submit(symbol, OrderSide.BUY, INITIAL_SHARES)
            self._positions[symbol] = PositionState(
                entry_price=price,
                shares=INITIAL_SHARES,
                stop_loss=stop,
                peak_price=price,
            )
            self._print_summary(
                order, price, "Initial entry",
                extra={
                    "Stop Loss Set":      f"${stop:.2f}  (entry − {STOP_LOSS_PCT*100:.0f}%)",
                    "Trail Activates At": f"${price*(1+TRAIL_ACTIVATE_PCT):.2f}  (+{TRAIL_ACTIVATE_PCT*100:.0f}%)",
                    "Total Held":         f"{INITIAL_SHARES} shares",
                },
            )

        elif signal == "stop_loss":
            state   = self._positions[symbol]
            order   = self._submit(symbol, OrderSide.SELL, state.shares)
            pnl_pct = (price - state.entry_price) / state.entry_price * 100
            self._print_summary(
                order, price, "Stop loss triggered",
                extra={
                    "Entry Price": f"${state.entry_price:.2f}",
                    "Exit Price":  f"${price:.2f}",
                    "P&L":         f"{pnl_pct:+.1f}%",
                    "Shares Sold": str(state.shares),
                },
            )
            del self._positions[symbol]

        elif signal.startswith("ladder_"):
            state    = self._positions[symbol]
            level_id = int(signal.split("_")[1])
            all_lvls = dict((lid, (drop, sh)) for lid, drop, sh in _ALL_LEVELS + _DEEP_LEVELS)
            drop_thr, shares = all_lvls[level_id]
            order = self._submit(symbol, OrderSide.BUY, shares)
            state.shares += shares
            state.ladder_hit.add(level_id)
            self._print_summary(
                order, price, f"Ladder L{level_id}  (−{drop_thr*100:.0f}% dip buy)",
                extra={
                    "Entry Price":    f"${state.entry_price:.2f}",
                    "Current Drop":   f"−{(state.entry_price-price)/state.entry_price*100:.1f}%",
                    "Shares Added":   str(shares),
                    "Total Held":     f"{state.shares} shares",
                    "Stop Loss":      f"${state.stop_loss:.2f}",
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
        bar       = "═" * 54
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
