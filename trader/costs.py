"""
Cost accounting: fees, slippage, and tax reserve for every order.

All figures are US retail estimates as of 2025. Update rates as needed.

IMPORTANT on taxes
  This module estimates a SHORT-TERM reserve only (position held < 1 year).
  Options and wheel trades are almost always short-term. Long-term rates
  apply only to positions held > 365 days and are significantly lower.
  This is not tax advice — consult a CPA.
"""

from __future__ import annotations

from dataclasses import dataclass

from alpaca.trading.enums import OrderSide

# ── Brokerage fees (Alpaca, 2025) ─────────────────────────────────────────
STOCK_COMMISSION_PER_TRADE  = 0.0      # $0 — Alpaca charges no stock commission
OPTION_COMMISSION_PER_CONTRACT = 0.65  # $0.65 per contract (100 shares each)

# ── Regulatory fees ───────────────────────────────────────────────────────
# SEC fee on sells: $27.80 per $1M notional (updated annually)
SEC_FEE_RATE                = 0.0000278
# FINRA TAF on sells: $0.000166 per share, max $8.30 per trade
FINRA_TAF_PER_SHARE         = 0.000166
FINRA_TAF_MAX               = 8.30

# ── Slippage estimates ────────────────────────────────────────────────────
# Paper trading fills at mid-price. Real fills pay the spread.
# Stocks: typical TSLA spread ≈ 0.05–0.10 %; using conservative 0.10 %.
# Options: spreads are much wider — typically 1–4 % of mid on liquid names,
#          can be 5–10 % on less liquid contracts.
STOCK_SLIPPAGE_PCT          = 0.001    # 0.10 % of notional
OPTION_SLIPPAGE_PCT         = 0.025   # 2.50 % of premium (conservative)

# ── Tax reserve ───────────────────────────────────────────────────────────
# Top federal short-term capital gains rate (2025).
# State tax varies — NY/CA add 10–13 % on top of federal.
# This reserve is an estimate only; adjust SHORT_TERM_TAX_RATE to your bracket.
SHORT_TERM_TAX_RATE         = 0.37    # 37 % federal bracket (adjust to yours)
STATE_TAX_RATE              = 0.00    # add your state rate, e.g. 0.093 for CA


@dataclass
class CostBreakdown:
    notional:            float   # qty × price
    commission:          float   # brokerage commission
    sec_fee:             float   # SEC sell fee (0 on buys)
    finra_taf:           float   # FINRA sell fee (0 on buys)
    slippage_estimate:   float   # estimated real-world spread cost
    total_fees:          float   # commission + regulatory fees
    gross_profit_est:    float   # notional (positive=proceeds, negative=cost)
    tax_reserve_est:     float   # estimated tax liability if this were a gain
    all_in_cost:         float   # notional + all fees + slippage

    def summary_line(self) -> str:
        return (
            f"notional=${self.notional:,.2f}  "
            f"fees=${self.total_fees:.2f}  "
            f"slip≈${self.slippage_estimate:.2f}  "
            f"tax_reserve≈${self.tax_reserve_est:.2f}"
        )

    def print_detail(self, indent: str = "  ") -> None:
        print(f"{indent}{'Notional':<28}: ${self.notional:>10,.2f}")
        print(f"{indent}{'Commission':<28}: ${self.commission:>10.2f}")
        print(f"{indent}{'SEC Fee (sell only)':<28}: ${self.sec_fee:>10.4f}")
        print(f"{indent}{'FINRA TAF (sell only)':<28}: ${self.finra_taf:>10.4f}")
        print(f"{indent}{'Est. Slippage (vs mid)':<28}: ${self.slippage_estimate:>10.2f}")
        print(f"{indent}{'─'*40}")
        print(f"{indent}{'Total Fees + Slippage':<28}: ${self.total_fees + self.slippage_estimate:>10.2f}")
        print(f"{indent}{'Short-term Tax Reserve':<28}: ${self.tax_reserve_est:>10.2f}  "
              f"({(SHORT_TERM_TAX_RATE + STATE_TAX_RATE)*100:.0f}% bracket — estimate only)")
        print(f"{indent}{'All-in Cost':<28}: ${self.all_in_cost:>10,.2f}")


def estimate_costs(
    price: float,
    qty: int,
    side: OrderSide,
    is_option: bool = False,
) -> CostBreakdown:
    """
    Compute the full cost breakdown for one order.

    qty     : shares for stocks; contracts for options (1 contract = 100 shares)
    price   : per-share price for stocks; per-share premium for options
    is_option: True for options contracts
    """
    if is_option:
        notional   = price * qty * 100      # 1 contract = 100 shares
        commission = OPTION_COMMISSION_PER_CONTRACT * qty
        slippage   = notional * OPTION_SLIPPAGE_PCT
    else:
        notional   = price * qty
        commission = STOCK_COMMISSION_PER_TRADE
        slippage   = notional * STOCK_SLIPPAGE_PCT

    is_sell = side in (OrderSide.SELL,)

    sec_fee   = notional * SEC_FEE_RATE if is_sell else 0.0
    finra_taf = min(FINRA_TAF_PER_SHARE * qty, FINRA_TAF_MAX) if is_sell else 0.0

    total_fees = commission + sec_fee + finra_taf

    # Tax reserve: estimated on the notional as if the entire amount were profit.
    # In practice taxes apply only to net gains — this is a worst-case estimate.
    tax_reserve = notional * (SHORT_TERM_TAX_RATE + STATE_TAX_RATE) if is_sell else 0.0

    all_in = notional + total_fees + slippage

    return CostBreakdown(
        notional           = round(notional, 4),
        commission         = round(commission, 4),
        sec_fee            = round(sec_fee, 6),
        finra_taf          = round(finra_taf, 6),
        slippage_estimate  = round(slippage, 4),
        total_fees         = round(total_fees, 4),
        gross_profit_est   = round(notional, 4),
        tax_reserve_est    = round(tax_reserve, 2),
        all_in_cost        = round(all_in, 2),
    )
