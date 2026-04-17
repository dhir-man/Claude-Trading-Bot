"""
Trade executor: replicates Capitol Trades disclosures via Alpaca paper trading.
- Stocks : market order, size mapped via config.SIZE_TO_SHARES
- Options: find nearest ATM contract; fall back to stock if none found
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from typing import Optional

from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce, ContractType
from alpaca.trading.requests import (
    MarketOrderRequest,
    GetOptionContractsRequest,
    OptionLegRequest,
)
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestTradeRequest

import copy_trading.config as cfg
from copy_trading.scraper import CapitolTrade


def _current_price(data: StockHistoricalDataClient, symbol: str) -> Optional[float]:
    try:
        req = StockLatestTradeRequest(symbol_or_symbols=symbol)
        return float(data.get_stock_latest_trade(req)[symbol].price)
    except Exception:
        return None


def _shares_for_size(size_label: str) -> int:
    for key, shares in cfg.SIZE_TO_SHARES.items():
        if key in size_label:
            return shares
    return cfg.DEFAULT_SHARES


def _find_option_contract(
    trading: TradingClient,
    symbol: str,
    option_type: str,          # "call" | "put"
) -> Optional[str]:
    """Return the symbol of the best matching option contract, or None."""
    try:
        kind = ContractType.CALL if option_type == "call" else ContractType.PUT
        req  = GetOptionContractsRequest(
            underlying_symbols   = [symbol],
            expiration_date_gte  = date.today() + timedelta(days=7),
            expiration_date_lte  = date.today() + timedelta(days=cfg.OPTION_DTE_SEARCH_DAYS),
            type                 = kind,
            limit                = 20,
        )
        contracts = trading.get_option_contracts(req).option_contracts
        if not contracts:
            return None
        # Pick the contract closest to ATM (lowest absolute distance from current OTM status)
        # Simple heuristic: first contract returned (Alpaca orders by expiry asc)
        return contracts[0].symbol
    except Exception as exc:
        print(f"[Executor] Option contract lookup failed for {symbol} {option_type}: {exc}")
        return None


def execute_trade(
    trade: CapitolTrade,
    trading: TradingClient,
    data: StockHistoricalDataClient,
) -> bool:
    """Execute one Capitol Trades disclosure. Returns True on success."""
    symbol = trade.ticker
    side   = OrderSide.BUY if trade.action == "buy" else OrderSide.SELL
    shares = _shares_for_size(trade.size_label)
    price  = _current_price(data, symbol)

    # ── Options path ─────────────────────────────────────────────────────
    if trade.asset_type in ("call", "put"):
        contract_sym = _find_option_contract(trading, symbol, trade.asset_type)
        if contract_sym:
            return _place_option_order(trade, trading, contract_sym, price)
        elif cfg.OPTION_FALLBACK_TO_STOCK:
            print(f"[Executor] No option contract found for {symbol} — falling back to stock.")
        else:
            print(f"[Executor] No option contract found for {symbol} — skipping.")
            return False

    # ── Stock / fallback path ────────────────────────────────────────────
    return _place_stock_order(trade, trading, data, symbol, side, shares, price)


def _place_stock_order(
    trade: CapitolTrade,
    trading: TradingClient,
    data: StockHistoricalDataClient,
    symbol: str,
    side: OrderSide,
    shares: int,
    est_price: Optional[float],
) -> bool:
    try:
        # Can't sell what we don't own in paper trading — check first
        if side == OrderSide.SELL:
            try:
                pos = trading.get_open_position(symbol)
                shares = min(shares, int(float(pos.qty)))
                if shares == 0:
                    print(f"[Executor] No {symbol} position to sell — skipping.")
                    return False
            except Exception:
                print(f"[Executor] No {symbol} position to sell — skipping.")
                return False

        order = trading.submit_order(MarketOrderRequest(
            symbol          = symbol,
            qty             = shares,
            side            = side,
            time_in_force   = TimeInForce.DAY,
        ))
        _print_summary(trade, order, est_price, shares, asset="Stock")
        return True
    except Exception as exc:
        print(f"[Executor] Stock order failed for {symbol}: {exc}")
        return False


def _place_option_order(
    trade: CapitolTrade,
    trading: TradingClient,
    contract_sym: str,
    est_price: Optional[float],
) -> bool:
    try:
        contracts = cfg.OPTION_CONTRACTS_PER_LEG
        side      = OrderSide.BUY if trade.action == "buy" else OrderSide.SELL
        order = trading.submit_order(MarketOrderRequest(
            symbol          = contract_sym,
            qty             = contracts,
            side            = side,
            time_in_force   = TimeInForce.DAY,
        ))
        _print_summary(trade, order, est_price, contracts, asset=f"Option ({trade.asset_type.upper()})")
        return True
    except Exception as exc:
        print(f"[Executor] Option order failed for {contract_sym}: {exc}")
        return False


def _print_summary(trade: CapitolTrade, order, est_price: Optional[float], qty: int, asset: str) -> None:
    side      = order.side.value.upper()
    price_str = f"${est_price:.2f}" if est_price else "N/A (mkt)"
    total_str = f"${est_price * qty:,.2f}" if est_price else "N/A"
    age_days  = (date.today() - trade.traded_date).days

    bar = "═" * 58
    print(f"\n{bar}")
    print(f"  {'COPY TRADE ORDER':^54}")
    print(bar)
    print(f"  {'Politician':<24}: {trade.politician_name}")
    print(f"  {'Symbol':<24}: {trade.ticker}")
    print(f"  {'Asset':<24}: {asset}")
    print(f"  {'Action':<24}: {side}")
    print(f"  {'Quantity':<24}: {qty}")
    print(f"  {'Est. Price':<24}: {price_str}")
    print(f"  {'Est. Total':<24}: {total_str}")
    print(f"  {'─'*54}")
    print(f"  {'Politician Size':<24}: {trade.size_label or 'N/A'}")
    print(f"  {'Trade Date':<24}: {trade.traded_date}  ({age_days}d ago)")
    print(f"  {'Filed Date':<24}: {trade.filed_date}")
    print(f"  {'Owner':<24}: {trade.owner}")
    print(f"  {'Order ID':<24}: {order.id}")
    print(f"  {'Status':<24}: {order.status.value}")
    print(bar)
    sys.stdout.flush()
