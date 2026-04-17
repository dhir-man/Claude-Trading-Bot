"""
The Wheel Strategy state machine.

Stage transitions:
  IDLE → SHORT_PUT   : sell a cash-secured put
  SHORT_PUT → IDLE   : put expired worthless → sell another
  SHORT_PUT → ASSIGNED: put was assigned (stock purchased at strike)
  ASSIGNED → SHORT_CALL: sell a covered call
  SHORT_CALL → ASSIGNED: call expired worthless → sell another
  SHORT_CALL → IDLE  : call was assigned (stock sold) → start over
"""

from __future__ import annotations

import sys
from datetime import date
from typing import Optional

from alpaca.data.historical import OptionHistoricalDataClient
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestTradeRequest
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.trading.requests import LimitOrderRequest

import wheel_strategy.config as cfg
import wheel_strategy.finder as finder
import wheel_strategy.state as st
from wheel_strategy.state import Stage, WheelState


class WheelStrategy:

    def __init__(
        self,
        trading: TradingClient,
        stock_data: StockHistoricalDataClient,
        option_data: OptionHistoricalDataClient,
    ):
        self.trading     = trading
        self.stock_data  = stock_data
        self.option_data = option_data

    # ── Public API ────────────────────────────────────────────────────────

    def check(self) -> None:
        """15-minute evaluation pass — evaluates state and takes action."""
        state = st.load()
        print(f"\n[Wheel] Stage={state.stage}  "
              f"contract={state.contract_symbol or 'none'}  "
              f"shares={state.shares_owned}")

        if state.stage == Stage.IDLE:
            self._enter_put(state)

        elif state.stage == Stage.SHORT_PUT:
            self._manage_put(state)

        elif state.stage == Stage.ASSIGNED:
            self._enter_call(state)

        elif state.stage == Stage.SHORT_CALL:
            self._manage_call(state)

        st.save(state)

    def daily_summary(self) -> None:
        """End-of-day report — call once at market close."""
        state   = st.load()
        account = self.trading.get_account()
        price   = self._stock_price()

        # Unrealized P&L on held shares
        unreal_pnl = 0.0
        if state.shares_owned > 0 and state.cost_basis_per_share > 0 and price:
            unreal_pnl = (price - state.cost_basis_per_share) * state.shares_owned

        # Open contract value
        contract_mid = None
        contract_pnl = 0.0
        if state.contract_symbol:
            contract_mid = finder.current_mid(self.option_data, state.contract_symbol)
            if contract_mid and state.contract_premium > 0:
                # Short position: profit = premium received - current value
                contract_pnl = (state.contract_premium - contract_mid) * 100 * cfg.PUT_CONTRACTS

        stage_label = {
            Stage.IDLE:       "Stage 1 — Ready to sell put",
            Stage.SHORT_PUT:  "Stage 1 — Short put open",
            Stage.ASSIGNED:   "Stage 2 — Shares owned, ready to sell call",
            Stage.SHORT_CALL: "Stage 2 — Short call open",
        }.get(state.stage, state.stage)

        bar = "═" * 62
        print(f"\n{bar}")
        print(f"  {'WHEEL STRATEGY — DAILY SUMMARY':^58}")
        print(f"  {date.today()}  |  {cfg.SYMBOL}")
        print(bar)
        print(f"  {'Current Stage':<28}: {stage_label}")
        print(f"  {'Cycles Completed':<28}: {state.cycles_completed}")
        print(f"  {'─'*58}")

        if state.contract_symbol:
            expiry      = state.contract_expiry or "?"
            dte         = (date.fromisoformat(expiry) - date.today()).days if expiry else "?"
            mid_str     = f"${contract_mid:.2f}/sh" if contract_mid else "N/A"
            pnl_str     = f"${contract_pnl:+,.2f}" if contract_mid else "N/A"
            print(f"  {'Open Contract':<28}: {state.contract_symbol}")
            print(f"  {'  Strike':<28}: ${state.contract_strike:.2f}")
            print(f"  {'  Expiry':<28}: {expiry}  ({dte}DTE)")
            print(f"  {'  Premium Received':<28}: ${state.contract_premium:.2f}/sh  (${state.contract_premium*100:.0f}/contract)")
            print(f"  {'  Current Mid':<28}: {mid_str}")
            print(f"  {'  Unrealized P&L':<28}: {pnl_str}")
            print(f"  {'─'*58}")

        if state.shares_owned > 0:
            price_str = f"${price:.2f}" if price else "N/A"
            print(f"  {'Shares Owned':<28}: {state.shares_owned} shares")
            print(f"  {'Assignment Price':<28}: ${state.assignment_price:.2f}/sh")
            print(f"  {'Adjusted Cost Basis':<28}: ${state.cost_basis_per_share:.2f}/sh")
            print(f"  {'Current Price':<28}: {price_str}")
            print(f"  {'Unrealized Stock P&L':<28}: ${unreal_pnl:+,.2f}")
            print(f"  {'─'*58}")

        total_dollar = state.total_premium_per_share * 100 * cfg.PUT_CONTRACTS
        print(f"  {'Total Premium Collected':<28}: ${state.total_premium_per_share:.2f}/sh  (${total_dollar:,.2f} total)")
        print(f"  {'Paper Cash':<28}: ${float(account.cash):,.2f}")
        print(f"  {'Paper Equity':<28}: ${float(account.equity):,.2f}")
        print(bar)
        sys.stdout.flush()

    # ── Stage 1: Sell Put ─────────────────────────────────────────────────

    def _enter_put(self, state: WheelState) -> None:
        price = self._stock_price()
        if not price:
            print("[Wheel] Cannot get stock price — skipping.")
            return

        result = finder.find_put(self.trading, self.option_data, price)
        if not result:
            return

        contract, mid = result
        strike = float(contract.strike_price)

        # Cash-secured check: must have enough cash to buy the shares if assigned
        required_cash = strike * 100 * cfg.PUT_CONTRACTS
        account       = self.trading.get_account()
        if float(account.cash) < required_cash:
            print(
                f"[Wheel] Insufficient cash for cash-secured put. "
                f"Need ${required_cash:,.2f}, have ${float(account.cash):,.2f}"
            )
            return

        limit_price = round(mid - cfg.SELL_LIMIT_OFFSET, 2)
        order = self._sell_to_open(contract.symbol, cfg.PUT_CONTRACTS, limit_price)
        if not order:
            return

        state.stage             = Stage.SHORT_PUT
        state.contract_symbol   = contract.symbol
        state.contract_strike   = strike
        state.contract_expiry   = str(contract.expiration_date)
        state.contract_premium  = mid
        if not state.cycle_start_date:
            state.cycle_start_date = str(date.today())

        self._print_order(
            action="SELL TO OPEN (PUT)",
            order=order,
            contract_sym=contract.symbol,
            strike=strike,
            expiry=str(contract.expiration_date),
            premium=mid,
            limit=limit_price,
            extra={
                "Cash Required":      f"${required_cash:,.2f}  (secured)",
                "Cash Available":     f"${float(account.cash):,.2f}",
                "Max Loss if Assigned": f"${(strike - mid) * 100 * cfg.PUT_CONTRACTS:,.2f}",
                "Close Target (50%)": f"${mid * (1 - cfg.EARLY_CLOSE_PROFIT_PCT):.2f}/sh",
            },
        )

    def _manage_put(self, state: WheelState) -> None:
        # Check if contract is still open
        contract_open = self._position_exists(state.contract_symbol)

        if contract_open:
            # Check for 50% profit early close
            mid = finder.current_mid(self.option_data, state.contract_symbol)
            if mid is None:
                return
            profit_pct = (state.contract_premium - mid) / state.contract_premium
            print(
                f"[Wheel] Put mid=${mid:.2f}/sh  "
                f"profit={profit_pct*100:.1f}%  "
                f"target={cfg.EARLY_CLOSE_PROFIT_PCT*100:.0f}%"
            )
            if profit_pct >= cfg.EARLY_CLOSE_PROFIT_PCT:
                self._close_contract(state, mid, "PUT", "50% profit target")
                state.stage = Stage.IDLE
            return

        # Contract is gone — determine why
        expiry = date.fromisoformat(state.contract_expiry)
        if date.today() < expiry:
            # Disappeared before expiry — unusual; log and reset
            print(f"[Wheel] Put contract gone before expiry {expiry}. Checking stock.")

        # Check for shares (assignment)
        shares = self._shares_owned()
        if shares >= 100 * cfg.PUT_CONTRACTS:
            avg_cost = self._avg_cost_basis()
            state.stage            = Stage.ASSIGNED
            state.shares_owned     = shares
            state.assignment_price = avg_cost or state.contract_strike
            state.cost_basis_per_share = state.assignment_price - state.total_premium_per_share
            self._print_event(
                "PUT ASSIGNED — Moving to Stage 2",
                {
                    "Shares Acquired":    str(shares),
                    "Assignment Price":   f"${state.assignment_price:.2f}/sh",
                    "Premiums Collected": f"${state.total_premium_per_share:.2f}/sh",
                    "Adjusted Cost Basis":f"${state.cost_basis_per_share:.2f}/sh",
                },
            )
        else:
            # Expired worthless
            self._print_event(
                "PUT EXPIRED WORTHLESS — Collecting premium, selling new put",
                {"Premium Kept": f"${state.contract_premium:.2f}/sh  (${state.contract_premium*100:.0f}/contract)"},
            )
            state.stage = Stage.IDLE

        # Clear contract
        state.contract_symbol  = None
        state.contract_premium = 0.0
        state.contract_expiry  = None
        state.contract_strike  = 0.0

    # ── Stage 2: Sell Call ────────────────────────────────────────────────

    def _enter_call(self, state: WheelState) -> None:
        required_shares = 100 * cfg.CALL_CONTRACTS
        if state.shares_owned < required_shares:
            print(f"[Wheel] Need {required_shares} shares to sell covered call, have {state.shares_owned}.")
            return

        result = finder.find_call(self.trading, self.option_data, state.cost_basis_per_share)
        if not result:
            return

        contract, mid = result
        strike = float(contract.strike_price)

        # Final guard: never sell call below cost basis
        if strike < state.cost_basis_per_share:
            print(
                f"[Wheel] Call strike ${strike:.2f} < cost basis ${state.cost_basis_per_share:.2f} — skipping."
            )
            return

        limit_price = round(mid - cfg.SELL_LIMIT_OFFSET, 2)
        order = self._sell_to_open(contract.symbol, cfg.CALL_CONTRACTS, limit_price)
        if not order:
            return

        state.stage             = Stage.SHORT_CALL
        state.contract_symbol   = contract.symbol
        state.contract_strike   = strike
        state.contract_expiry   = str(contract.expiration_date)
        state.contract_premium  = mid

        profit_if_called = (strike - state.cost_basis_per_share + mid) * 100 * cfg.CALL_CONTRACTS
        self._print_order(
            action="SELL TO OPEN (CALL)",
            order=order,
            contract_sym=contract.symbol,
            strike=strike,
            expiry=str(contract.expiration_date),
            premium=mid,
            limit=limit_price,
            extra={
                "Adjusted Cost Basis":  f"${state.cost_basis_per_share:.2f}/sh",
                "Profit if Called Away":f"${profit_if_called:,.2f}",
                "Close Target (50%)":   f"${mid * (1 - cfg.EARLY_CLOSE_PROFIT_PCT):.2f}/sh",
            },
        )

    def _manage_call(self, state: WheelState) -> None:
        contract_open = self._position_exists(state.contract_symbol)

        if contract_open:
            mid = finder.current_mid(self.option_data, state.contract_symbol)
            if mid is None:
                return
            profit_pct = (state.contract_premium - mid) / state.contract_premium
            print(
                f"[Wheel] Call mid=${mid:.2f}/sh  "
                f"profit={profit_pct*100:.1f}%  "
                f"target={cfg.EARLY_CLOSE_PROFIT_PCT*100:.0f}%"
            )
            if profit_pct >= cfg.EARLY_CLOSE_PROFIT_PCT:
                self._close_contract(state, mid, "CALL", "50% profit target")
                state.stage = Stage.ASSIGNED
            return

        # Contract gone — check if we still own shares
        shares = self._shares_owned()

        if shares < 100 * cfg.CALL_CONTRACTS:
            # Shares were called away → completed a full cycle
            state.cycles_completed += 1
            state.cycle_start_date  = None
            self._print_event(
                f"CALL ASSIGNED — Shares sold. Cycle #{state.cycles_completed} complete. Back to Stage 1.",
                {
                    "Total Premium (lifetime)": f"${state.total_premium_per_share:.2f}/sh  (${state.total_premium_per_share*100:,.0f} total)",
                    "Cycles Completed":         str(state.cycles_completed),
                },
            )
            state.stage            = Stage.IDLE
            state.shares_owned     = 0
            state.assignment_price = 0.0
            state.cost_basis_per_share = 0.0
        else:
            # Call expired worthless — sell another
            self._print_event(
                "CALL EXPIRED WORTHLESS — Collecting premium, selling new call",
                {
                    "Premium Kept":       f"${state.contract_premium:.2f}/sh  (${state.contract_premium*100:.0f}/contract)",
                    "Shares Still Owned": str(shares),
                    "Cost Basis":         f"${state.cost_basis_per_share:.2f}/sh",
                },
            )
            state.shares_owned = shares
            state.stage        = Stage.ASSIGNED

        state.contract_symbol  = None
        state.contract_premium = 0.0
        state.contract_expiry  = None
        state.contract_strike  = 0.0

    # ── Order helpers ─────────────────────────────────────────────────────

    def _sell_to_open(self, symbol: str, qty: int, limit_price: float):
        try:
            return self.trading.submit_order(
                LimitOrderRequest(
                    symbol         = symbol,
                    qty            = qty,
                    side           = OrderSide.SELL,
                    limit_price    = max(limit_price, 0.01),
                    time_in_force  = TimeInForce.DAY,
                )
            )
        except Exception as exc:
            print(f"[Wheel] Sell-to-open failed for {symbol}: {exc}")
            return None

    def _close_contract(self, state: WheelState, current_mid: float, kind: str, reason: str) -> None:
        limit_price  = round(current_mid + cfg.BUY_LIMIT_OFFSET, 2)
        qty          = cfg.PUT_CONTRACTS if kind == "PUT" else cfg.CALL_CONTRACTS
        profit_share = state.contract_premium - current_mid
        try:
            order = self.trading.submit_order(
                LimitOrderRequest(
                    symbol        = state.contract_symbol,
                    qty           = qty,
                    side          = OrderSide.BUY,
                    limit_price   = limit_price,
                    time_in_force = TimeInForce.DAY,
                )
            )
            # The premium we keep = what we collected − what we paid to close
            kept_per_share = state.contract_premium - current_mid
            state.total_premium_per_share += kept_per_share
            if state.shares_owned > 0:
                state.cost_basis_per_share = state.assignment_price - state.total_premium_per_share
            self._print_order(
                action=f"BUY TO CLOSE ({kind}) — {reason}",
                order=order,
                contract_sym=state.contract_symbol,
                strike=state.contract_strike,
                expiry=state.contract_expiry,
                premium=current_mid,
                limit=limit_price,
                extra={
                    "Original Premium":     f"${state.contract_premium:.2f}/sh",
                    "Close Price":          f"${current_mid:.2f}/sh",
                    "Profit This Contract": f"${profit_share:.2f}/sh  (${profit_share*100*qty:,.0f} total)",
                    "Cumulative Premium":   f"${state.total_premium_per_share:.2f}/sh",
                },
            )
        except Exception as exc:
            print(f"[Wheel] Buy-to-close failed: {exc}")

    # ── Broker queries ────────────────────────────────────────────────────

    def _stock_price(self) -> Optional[float]:
        try:
            req = StockLatestTradeRequest(symbol_or_symbols=cfg.SYMBOL)
            return float(self.stock_data.get_stock_latest_trade(req)[cfg.SYMBOL].price)
        except Exception:
            return None

    def _position_exists(self, symbol: Optional[str]) -> bool:
        if not symbol:
            return False
        try:
            self.trading.get_open_position(symbol)
            return True
        except Exception:
            return False

    def _shares_owned(self) -> int:
        try:
            pos = self.trading.get_open_position(cfg.SYMBOL)
            return int(float(pos.qty))
        except Exception:
            return 0

    def _avg_cost_basis(self) -> Optional[float]:
        try:
            pos = self.trading.get_open_position(cfg.SYMBOL)
            return float(pos.avg_entry_price)
        except Exception:
            return None

    # ── Premium accounting ────────────────────────────────────────────────

    def _record_premium(self, state: WheelState, premium_per_share: float) -> None:
        state.total_premium_per_share += premium_per_share
        if state.shares_owned > 0:
            state.cost_basis_per_share = state.assignment_price - state.total_premium_per_share

    # ── Print helpers ─────────────────────────────────────────────────────

    def _print_order(
        self,
        action: str,
        order,
        contract_sym: str,
        strike: float,
        expiry: str,
        premium: float,
        limit: float,
        extra: dict | None = None,
    ) -> None:
        bar = "═" * 62
        print(f"\n{bar}")
        print(f"  {'WHEEL ORDER':^58}")
        print(bar)
        print(f"  {'Action':<28}: {action}")
        print(f"  {'Underlying':<28}: {cfg.SYMBOL}")
        print(f"  {'Contract':<28}: {contract_sym}")
        print(f"  {'Strike':<28}: ${strike:.2f}")
        print(f"  {'Expiry':<28}: {expiry}")
        print(f"  {'Mid / Limit':<28}: ${premium:.2f} / ${limit:.2f}  per share")
        print(f"  {'Contract Value':<28}: ~${premium*100:.0f}  per contract")
        print(f"  {'Order ID':<28}: {order.id}")
        print(f"  {'Status':<28}: {order.status.value}")
        if extra:
            print(f"  {'─'*58}")
            for k, v in extra.items():
                print(f"  {k:<28}: {v}")
        print(bar)
        sys.stdout.flush()

    def _print_event(self, title: str, details: dict) -> None:
        bar = "─" * 62
        print(f"\n{bar}")
        print(f"  [Wheel] {title}")
        for k, v in details.items():
            print(f"  {k:<30}: {v}")
        print(bar)
        sys.stdout.flush()
