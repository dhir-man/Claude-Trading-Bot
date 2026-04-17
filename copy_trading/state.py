"""
Persistent state: tracks which trade IDs we have already executed
so we never double-fill on repeated scheduler runs.
"""

import json
import os
from datetime import datetime
from typing import Set

_STATE_FILE = os.path.join(os.path.dirname(__file__), "state.json")


def _load() -> dict:
    if os.path.exists(_STATE_FILE):
        with open(_STATE_FILE) as f:
            return json.load(f)
    return {"executed": [], "last_checked": None}


def _save(data: dict) -> None:
    with open(_STATE_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def already_executed(trade_id: str) -> bool:
    return trade_id in set(_load()["executed"])


def mark_executed(trade_id: str) -> None:
    data = _load()
    executed: list = data["executed"]
    if trade_id not in executed:
        executed.append(trade_id)
    # keep only last 2000 IDs to prevent unbounded growth
    data["executed"] = executed[-2000:]
    _save(data)


def update_last_checked() -> None:
    data = _load()
    data["last_checked"] = datetime.utcnow().isoformat()
    _save(data)


def last_checked() -> str | None:
    return _load().get("last_checked")
