"""
Trailing Stop Strategy
======================
Two stop modes — switch with USE_ATR_STOP:

PERCENTAGE mode (USE_ATR_STOP = False)
  Simple fixed % floor. Easy to reason about, but ignores whether the
  stock is quiet or wildly volatile. A 10 % stop on a high-beta name
  like TSLA will trigger on normal noise; the same stop on a utility
  will barely ever fire.

ATR mode (USE_ATR_STOP = True)  ← recommended
  Stop is ATR_MULTIPLIER × 14-day Average True Range below the running
  peak. When the stock is calm the stop sits tighter; when it's volatile
  the stop gives more room, so you're not shaken out by normal swings.
  This is the more principled approach.

  Typical ATR_MULTIPLIER values:
    1.5 – tight, suits low-volatility stocks or short holding periods
    2.0 – moderate
    2.5 – standard for high-beta stocks (TSLA, NVDA)
    3.0 – loose, for longer-term holds where you want to ride out noise

Ladder: tiered dip buys on the way down. See constants below.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest, StockLatestTradeRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.trading.requests import MarketOrderRequest

from trader.strategies.base import BaseStrategy

# ── Stop mode ─────────────────────────────────────────────────────────────
USE_ATR_STOP    = True      # True → ATR-based stop; False → percentage-based

# ── ATR stop parameters (active when USE_ATR_STOP = True) ─────────────────
ATR_PERIOD      = 14        # look-back days for ATR calculation
ATR_MULTIPLIER  = 2.5       # stop = peak − (ATR_MULTIPLIER × ATR)
                             # 2.5× is suitable for high-volatility stocks like TSLA

# ── Percentage stop parameters (active when USE_ATR_STOP = False) ─────────
STOP_LOSS_PCT       = 0.10  # drop from entry → sell everything
TRAIL_ACTIVATE_PCT  = 0.10  # gain needed before floor starts moving
TRAIL_OFFSET_PCT    = 0.05  # trailing floor = peak × (1 − this)

# ── Entry ─────────────────────────────────────────────────────────────────
INITIAL_SHARES  = 10        # shares purchased on first entry

# ── Standard ladder (dip buys within the stop band) ──────────────────────
LADDER_L0_DROP      = 0.03   # 3 %  drop from entry → quick nibble
LADDER_L0_SHARES    = 3

LADDER_L1_DROP      = 0.05   # 5 %  drop
LADDER_L1_SHARES    = 5

LADDER_L2_DROP      = 0.08   # 8 %  drop → near stop floor
LADDER_L2_SHARES    = 8

# ── Deep ladder (disabled by default) ────────────────────────────────────
# ⚠  With ATR stops, large-move thresholds depend on current volatility.
# ⚠  With % stops, set STOP_LOSS_PCT ≥ 0.35 before enabling.
ENABLE_DEEP_LADDER  = False

LADDER_L3_DROP      = 0.20   # 20 % drop → strong conviction buy
LADDER_L3_SHARES    = 20

LADDER_L4_DROP      = 0.30   # 30 % drop → max conviction buy
LADDER_L4_SHARES    = 10

# ─────────────────────────────────────────────────────────────────────────

_ALL_LEVELS  = [(0, LADDER_L0_DROP, LADDER_L0_SHARES),
                (1, LADDER_L1_DROP, LADDER_L1_SHARES),
                (2, LADDER_L2_DROP, LADDER_L2_SHARES)]
_DEEP_LEVELS = [(3, LADDER_L3_DROP, LADDER_L3_SHARES),
                (4, LADDER_L4_DROP, LADDER_L4_SHARES)]


@dataclass
class PositionState:
    entry_price: float
    shares: int
    stop_loss: float      # current floor — moves up, never down
    peak_price: float     # highest price seen since entry
    ladder_hit: Set[int] = field(default_factory=set)
    last_atr: float = 0.0   # cached ATR so we can display it


class TrailingStopStrategy(BaseStrategy):
    """
    Trailing stop with optional ATR-based floor.
    Stateful per-symbol; recovers open broker positions on restart.
    """

    def __init__(self, trading: TradingClient, data: StockHistoricalDataClient):
        super().__init__(trading, data)
        self._positions: dict[str, PositionState] = {}

    # ── ATR ───────────────────────────────────────────────────────────────

    def _compute_atr(self, symbol: str) -> float:
        """14-day Average True Range from daily bars."""
        try:
            end   = datetime.now(timezone.utc)
            start = end - timedelta(days=ATR_PERIOD * 3)   # fetch extra to ensure N bars
            req   = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=TimeFrame.Day,
                start=start,
                end=end,
            )
            bars: List = self.data.get_stock_bars(req)[symbol]
            if len(bars) < 2:
                return 0.0

            trs = []
            for i in range(1, len(bars)):
                high, low, prev_close = bars[i].high, bars[i].low, bars[i - 1].close
                trs.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))

            period = min(ATR_PERIOD, len(trs))
            return sum(trs[-period:]) / period
        except Exception as exc:
            print(f"[{symbol}] ATR calculation failed: {exc}")
            return 0.0

    def _atr_stop(self, peak: float, atr: float) -> float:
        """Stop floor = peak − (multiplier × ATR). Never negative."""
        return max(peak - ATR_MULTIPLIER * atr, 0.01)

    # ── Price feed ────────────────────────────────────────────────────────

    def _current_price(self, symbol: str) -> float:
        req = StockLatestTradeRequest(symbol_or_symbols=symbol)
        return float(self.data.get_stock_latest_trade(req)[symbol].price)

    # ── Signal evaluation ─────────────────────────────────────────────────

    def evaluate(self, symbol: str) -> str:
        price = self._current_price(symbol)
        state = self._positions.get(symbol)

        # Recover existing broker position on restart
        if state is None:
            try:
                pos   = self.trading.get_open_position(symbol)
                entry = float(pos.avg_entry_price)
                qty   = int(float(pos.qty))
                atr   = self._compute_atr(symbol) if USE_ATR_STOP else 0.0
                stop  = (self._atr_stop(entry, atr) if USE_ATR_STOP
                         else entry * (1 - STOP_LOSS_PCT))
                state = PositionState(
                    entry_price=entry, shares=qty,
                    stop_loss=stop, peak_price=entry, last_atr=atr,
                )
                self._positions[symbol] = state
                stop_label = (f"ATR={atr:.2f}  ×{ATR_MULTIPLIER}" if USE_ATR_STOP
                              else f"−{STOP_LOSS_PCT*100:.0f}%")
                print(
                    f"[{symbol}] Restored: {qty} shares @ ${entry:.2f}  "
                    f"|  stop ${state.stop_loss:.2f}  ({stop_label})"
                )
            except Exception:
                return "entry"

        # Refresh ATR and update trailing floor on every tick
        if USE_ATR_STOP:
            atr = self._compute_atr(symbol)
            state.last_atr = atr
            if price > state.peak_price:
                state.peak_price = price
            candidate = self._atr_stop(state.peak_price, atr)
            if candidate > state.stop_loss:
                old = state.stop_loss
                state.stop_loss = candidate
                print(
                    f"[{symbol}] ATR floor raised: ${old:.2f} → ${state.stop_loss:.2f}"
                    f"  (ATR={atr:.2f}  peak=${state.peak_price:.2f})"
                )
        else:
            gain_pct = (price - state.entry_price) / state.entry_price
            if price > state.peak_price:
                state.peak_price = price
            if gain_pct >= TRAIL_ACTIVATE_PCT:
                candidate = state.peak_price * (1 - TRAIL_OFFSET_PCT)
                if candidate > state.stop_loss:
                    old = state.stop_loss
                    state.stop_loss = candidate
                    print(
                        f"[{symbol}] %  floor raised: ${old:.2f} → ${state.stop_loss:.2f}"
                        f"  (+{gain_pct*100:.1f}%  peak=${state.peak_price:.2f})"
                    )

        # Priority 1 — stop loss
        if price <= state.stop_loss:
            return "stop_loss"

        # Priority 2 — ladder levels (each fires once)
        drop_pct     = (state.entry_price - price) / state.entry_price
        active_lvls  = _ALL_LEVELS + (_DEEP_LEVELS if ENABLE_DEEP_LADDER else [])
        for lvl_id, drop_thr, _ in sorted(active_lvls, key=lambda x: -x[1]):
            if drop_pct >= drop_thr and lvl_id not in state.ladder_hit:
                return f"ladder_{lvl_id}"

        return "hold"

    # ── Order execution ───────────────────────────────────────────────────

    def execute(self, symbol: str, signal: str) -> None:
        if signal == "hold":
            return

        price = self._current_price(symbol)

        if signal == "entry":
            atr   = self._compute_atr(symbol) if USE_ATR_STOP else 0.0
            stop  = (self._atr_stop(price, atr) if USE_ATR_STOP
                     else price * (1 - STOP_LOSS_PCT))
            order = self._submit(symbol, OrderSide.BUY, INITIAL_SHARES)
            self._positions[symbol] = PositionState(
                entry_price=price, shares=INITIAL_SHARES,
                stop_loss=stop, peak_price=price, last_atr=atr,
            )
            if USE_ATR_STOP:
                stop_label   = f"${stop:.2f}  (entry − {ATR_MULTIPLIER}×ATR,  ATR={atr:.2f})"
                trail_label  = f"auto-adapts to ATR every tick"
            else:
                stop_label   = f"${stop:.2f}  (entry − {STOP_LOSS_PCT*100:.0f}%)"
                trail_label  = f"${price*(1+TRAIL_ACTIVATE_PCT):.2f}  (+{TRAIL_ACTIVATE_PCT*100:.0f}%)"
            self._print_summary(
                order, price, "Initial entry",
                extra={
                    "Stop Mode":          "ATR-based" if USE_ATR_STOP else "Percentage",
                    "Stop Loss Set":      stop_label,
                    "Trail":              trail_label,
                    "Total Held":         f"{INITIAL_SHARES} shares",
                },
            )

        elif signal == "stop_loss":
            state   = self._positions[symbol]
            order   = self._submit(symbol, OrderSide.SELL, state.shares)
            pnl_pct = (price - state.entry_price) / state.entry_price * 100
            atr_str = f"ATR={state.last_atr:.2f}" if USE_ATR_STOP else ""
            self._print_summary(
                order, price, "Stop loss triggered",
                extra={
                    "Entry Price":  f"${state.entry_price:.2f}",
                    "Stop Floor":   f"${state.stop_loss:.2f}  {atr_str}",
                    "Exit Price":   f"${price:.2f}",
                    "P&L":          f"{pnl_pct:+.1f}%",
                    "Shares Sold":  str(state.shares),
                },
            )
            del self._positions[symbol]

        elif signal.startswith("ladder_"):
            state    = self._positions[symbol]
            lvl_id   = int(signal.split("_")[1])
            all_lvls = {lid: (d, s) for lid, d, s in _ALL_LEVELS + _DEEP_LEVELS}
            drop_thr, shares = all_lvls[lvl_id]
            order = self._submit(symbol, OrderSide.BUY, shares)
            state.shares += shares
            state.ladder_hit.add(lvl_id)
            self._print_summary(
                order, price, f"Ladder L{lvl_id}  (−{drop_thr*100:.0f}% dip buy)",
                extra={
                    "Entry Price":  f"${state.entry_price:.2f}",
                    "Current Drop": f"−{(state.entry_price-price)/state.entry_price*100:.1f}%",
                    "ATR":          f"{state.last_atr:.2f}" if USE_ATR_STOP else "N/A (pct mode)",
                    "Shares Added": str(shares),
                    "Total Held":   f"{state.shares} shares",
                    "Stop Floor":   f"${state.stop_loss:.2f}",
                },
            )

    # ── Helpers ───────────────────────────────────────────────────────────

    def _submit(self, symbol: str, side: OrderSide, qty: int):
        return self.trading.submit_order(
            MarketOrderRequest(
                symbol=symbol, qty=qty, side=side,
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
