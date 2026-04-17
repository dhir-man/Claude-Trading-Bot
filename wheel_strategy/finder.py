"""
Contract selection: finds the best put or call to sell for the wheel.
Scoring weights strike proximity most heavily, then DTE proximity to target.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional, Tuple

from alpaca.data.historical import OptionHistoricalDataClient
from alpaca.data.requests import OptionLatestQuoteRequest
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import ContractType
from alpaca.trading.requests import GetOptionContractsRequest

import wheel_strategy.config as cfg


def _round_strike(price: float) -> float:
    r = cfg.STRIKE_ROUND_TO
    return round(round(price / r) * r, 2)


def _mid_price(option_data: OptionHistoricalDataClient, symbol: str) -> Optional[float]:
    try:
        req   = OptionLatestQuoteRequest(symbol_or_symbols=symbol)
        quote = option_data.get_option_latest_quote(req)[symbol]
        bid, ask = quote.bid_price, quote.ask_price
        if bid and ask and ask > 0:
            return round((bid + ask) / 2, 2)
    except Exception:
        pass
    return None


def _score(contract, target_strike: float, target_dte: int) -> float:
    """Lower = better. Weights strike proximity 2×, DTE proximity 1×."""
    dte         = (contract.expiration_date - date.today()).days
    strike_diff = abs(float(contract.strike_price) - target_strike)
    dte_diff    = abs(dte - target_dte)
    return strike_diff * 2.0 + dte_diff * 0.1


def find_put(
    trading: TradingClient,
    option_data: OptionHistoricalDataClient,
    current_price: float,
) -> Optional[Tuple[object, float]]:
    """
    Return (contract, mid_price) for the best cash-secured put to sell,
    or None if nothing meets the minimum premium threshold.
    """
    target_strike = _round_strike(current_price * (1 - cfg.PUT_STRIKE_OFFSET_PCT))
    min_expiry    = date.today() + timedelta(days=cfg.PUT_MIN_DTE)
    max_expiry    = date.today() + timedelta(days=cfg.PUT_MAX_DTE)

    # Widen the strike search ±15% around target to have candidates
    req = GetOptionContractsRequest(
        underlying_symbols = [cfg.SYMBOL],
        expiration_date_gte= str(min_expiry),
        expiration_date_lte= str(max_expiry),
        type               = ContractType.PUT,
        strike_price_gte   = str(round(target_strike * 0.85, 2)),
        strike_price_lte   = str(round(target_strike * 1.05, 2)),
    )
    try:
        contracts = trading.get_option_contracts(req).option_contracts
    except Exception as exc:
        print(f"[Finder] Error fetching put contracts: {exc}")
        return None

    if not contracts:
        print(f"[Finder] No put contracts found near ${target_strike:.2f} / {min_expiry}–{max_expiry}")
        return None

    # Score and sort
    scored = sorted(contracts, key=lambda c: _score(c, target_strike, cfg.PUT_TARGET_DTE))

    for contract in scored:
        mid = _mid_price(option_data, contract.symbol)
        if mid is None:
            continue
        if mid < cfg.MIN_PREMIUM_PER_SHARE:
            continue
        dte = (contract.expiration_date - date.today()).days
        print(
            f"[Finder] Best put: {contract.symbol}  "
            f"strike ${float(contract.strike_price):.2f}  "
            f"{dte}DTE  mid ${mid:.2f}/sh"
        )
        return contract, mid

    print(f"[Finder] All put candidates below min premium ${cfg.MIN_PREMIUM_PER_SHARE:.2f}/sh")
    return None


def find_call(
    trading: TradingClient,
    option_data: OptionHistoricalDataClient,
    cost_basis: float,
) -> Optional[Tuple[object, float]]:
    """
    Return (contract, mid_price) for the best covered call to sell.
    Strike is never allowed below cost_basis (ensures profit if assigned).
    """
    raw_target    = cost_basis * (1 + cfg.CALL_STRIKE_OFFSET_PCT)
    target_strike = _round_strike(raw_target)
    # Hard rule: never sell below cost basis
    if target_strike < cost_basis:
        target_strike = _round_strike(cost_basis + cfg.STRIKE_ROUND_TO)

    min_expiry = date.today() + timedelta(days=cfg.CALL_MIN_DTE)
    max_expiry = date.today() + timedelta(days=cfg.CALL_MAX_DTE)

    req = GetOptionContractsRequest(
        underlying_symbols = [cfg.SYMBOL],
        expiration_date_gte= str(min_expiry),
        expiration_date_lte= str(max_expiry),
        type               = ContractType.CALL,
        strike_price_gte   = str(round(target_strike * 0.95, 2)),
        strike_price_lte   = str(round(target_strike * 1.15, 2)),
    )
    try:
        contracts = trading.get_option_contracts(req).option_contracts
    except Exception as exc:
        print(f"[Finder] Error fetching call contracts: {exc}")
        return None

    if not contracts:
        print(f"[Finder] No call contracts found near ${target_strike:.2f} / {min_expiry}–{max_expiry}")
        return None

    # Filter out any strike below cost basis (hard rule)
    valid = [c for c in contracts if float(c.strike_price) >= cost_basis]
    if not valid:
        print(f"[Finder] No call contracts above cost basis ${cost_basis:.2f}")
        return None

    scored = sorted(valid, key=lambda c: _score(c, target_strike, cfg.CALL_TARGET_DTE))

    for contract in scored:
        mid = _mid_price(option_data, contract.symbol)
        if mid is None:
            continue
        if mid < cfg.MIN_PREMIUM_PER_SHARE:
            continue
        dte = (contract.expiration_date - date.today()).days
        print(
            f"[Finder] Best call: {contract.symbol}  "
            f"strike ${float(contract.strike_price):.2f}  "
            f"{dte}DTE  mid ${mid:.2f}/sh"
        )
        return contract, mid

    print(f"[Finder] All call candidates below min premium ${cfg.MIN_PREMIUM_PER_SHARE:.2f}/sh")
    return None


def current_mid(option_data: OptionHistoricalDataClient, symbol: str) -> Optional[float]:
    return _mid_price(option_data, symbol)
