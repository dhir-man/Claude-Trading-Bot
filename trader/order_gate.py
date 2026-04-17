"""
Order Gate — single choke point for all order submission.

Three execution modes (set EXECUTION_MODE in config.py):

  DRY_RUN  No orders are placed. Every intended order is logged with its
           full cost breakdown. Use this to validate strategy logic before
           committing capital. Claude Code runs in DRY_RUN by default.

  PAPER    Orders submitted to Alpaca paper trading. Zero financial risk.
           Fills are simulated optimistically — spreads, slippage, and
           partial fills are NOT modelled. Treat paper P&L as an upper bound.

  LIVE     Real money. Not implemented — raises NotImplementedError to
           prevent accidental activation. Requires deliberate code change
           and Alpaca live credentials.

Every submission (real or simulated) runs through CostBreakdown so the
caller always sees fees, slippage, and a short-term tax reserve estimate
alongside the order details.
"""

from __future__ import annotations

import sys
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional

from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.trading.requests import LimitOrderRequest, MarketOrderRequest

from trader.costs import CostBreakdown, estimate_costs


class ExecutionMode(str, Enum):
    DRY_RUN = "dry_run"   # log only — no orders placed (default)
    PAPER   = "paper"     # Alpaca paper account
    LIVE    = "live"      # real money — deliberately disabled


@dataclass
class MockOrder:
    """Returned by DRY_RUN submissions so callers need no special-casing."""
    id: str
    symbol: str
    qty: float
    side: OrderSide
    status: _MockStatus
    submitted_at: datetime

    class _MockStatus:
        value = "dry_run (not submitted)"


def submit_market(
    trading: TradingClient,
    mode: ExecutionMode,
    symbol: str,
    qty: int,
    side: OrderSide,
    est_price: float,
    *,
    is_option: bool = False,
    time_in_force: TimeInForce = TimeInForce.DAY,
) -> tuple[object, CostBreakdown]:
    """
    Submit a market order and return (order, costs).
    In DRY_RUN mode the order is never sent; a MockOrder is returned instead.
    """
    costs = estimate_costs(
        price=est_price,
        qty=qty,
        side=side,
        is_option=is_option,
    )

    if mode == ExecutionMode.DRY_RUN:
        order = MockOrder(
            id=f"dry-{uuid.uuid4().hex[:8]}",
            symbol=symbol,
            qty=float(qty),
            side=side,
            status=MockOrder._MockStatus(),
            submitted_at=datetime.utcnow(),
        )
        _print_dry_run(order, costs)
        return order, costs

    if mode == ExecutionMode.LIVE:
        raise NotImplementedError(
            "LIVE execution is not enabled. Switch EXECUTION_MODE to PAPER "
            "or DRY_RUN, set up a live Alpaca account, and remove this guard."
        )

    # PAPER mode
    order = trading.submit_order(
        MarketOrderRequest(
            symbol=symbol, qty=qty, side=side, time_in_force=time_in_force,
        )
    )
    return order, costs


def submit_limit(
    trading: TradingClient,
    mode: ExecutionMode,
    symbol: str,
    qty: int,
    side: OrderSide,
    limit_price: float,
    *,
    is_option: bool = False,
    time_in_force: TimeInForce = TimeInForce.DAY,
) -> tuple[object, CostBreakdown]:
    """Submit a limit order. DRY_RUN logs without placing."""
    costs = estimate_costs(
        price=limit_price,
        qty=qty,
        side=side,
        is_option=is_option,
    )

    if mode == ExecutionMode.DRY_RUN:
        order = MockOrder(
            id=f"dry-{uuid.uuid4().hex[:8]}",
            symbol=symbol,
            qty=float(qty),
            side=side,
            status=MockOrder._MockStatus(),
            submitted_at=datetime.utcnow(),
        )
        _print_dry_run(order, costs)
        return order, costs

    if mode == ExecutionMode.LIVE:
        raise NotImplementedError("LIVE execution is not enabled.")

    order = trading.submit_order(
        LimitOrderRequest(
            symbol=symbol,
            qty=qty,
            side=side,
            limit_price=max(limit_price, 0.01),
            time_in_force=time_in_force,
        )
    )
    return order, costs


def _print_dry_run(order: MockOrder, costs: CostBreakdown) -> None:
    bar = "┄" * 54
    print(f"\n{bar}")
    print(f"  [DRY RUN — order NOT placed]")
    print(f"  {order.symbol}  {order.side.value.upper()}  {int(order.qty)} units")
    print(f"  {costs.summary_line()}")
    print(bar)
    sys.stdout.flush()
