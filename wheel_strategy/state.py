"""
Persistent wheel state machine.
All state is written to wheel_state.json after every transition
so restarts pick up exactly where they left off.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import date
from enum import Enum
from typing import Optional

_STATE_FILE = os.path.join(os.path.dirname(__file__), "wheel_state.json")


class Stage(str, Enum):
    IDLE       = "IDLE"        # no open position — ready to sell a put
    SHORT_PUT  = "SHORT_PUT"   # have an open short put
    ASSIGNED   = "ASSIGNED"    # own shares — ready to sell a call
    SHORT_CALL = "SHORT_CALL"  # own shares + open short call


@dataclass
class WheelState:
    # ── Current stage ──────────────────────────────────────────────────
    stage: str = Stage.IDLE

    # ── Open contract (put or call) ────────────────────────────────────
    contract_symbol:   Optional[str]   = None
    contract_strike:   float           = 0.0
    contract_expiry:   Optional[str]   = None   # ISO date string
    contract_premium:  float           = 0.0    # $/share premium received at open

    # ── Stock position ─────────────────────────────────────────────────
    shares_owned:          int   = 0
    assignment_price:      float = 0.0  # strike price when put was assigned
    cost_basis_per_share:  float = 0.0  # assignment_price − cumulative premiums

    # ── Running P&L totals ─────────────────────────────────────────────
    total_premium_per_share: float = 0.0   # lifetime premium collected / 100 shares
    cycles_completed:        int   = 0     # full put → call → put cycles
    cycle_start_date:        Optional[str] = None


def load() -> WheelState:
    if os.path.exists(_STATE_FILE):
        with open(_STATE_FILE) as f:
            return WheelState(**json.load(f))
    return WheelState()


def save(state: WheelState) -> None:
    with open(_STATE_FILE, "w") as f:
        json.dump(asdict(state), f, indent=2, default=str)


def reset() -> WheelState:
    """Wipe state and start fresh (useful for testing or manual resets)."""
    fresh = WheelState()
    save(fresh)
    return fresh
