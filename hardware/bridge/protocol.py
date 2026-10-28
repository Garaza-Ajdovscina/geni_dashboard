"""Parse serial lines from Gen-I Arduino boards."""

from __future__ import annotations

TOGGLE_KEYS = ("solar", "wind", "nuclear", "hydro", "gas")
POT_KEYS = ("nuclear", "hydro", "gas", "batteryFlow")
BATTERY_MODES = frozenset({"charge", "discharge", "off"})


def parse_line(line: str) -> dict | None:
    line = line.strip()
    if not line or line.startswith("GENI,"):
        return None

    if line.startswith("S,"):
        return _parse_switches(line)
    if line.startswith("Cp,"):
        return _parse_panel_pots(line)
    if line.startswith("C,"):
        return _parse_controls(line)
    if line.startswith("P,"):
        return _parse_panel(line)
    return None


def _parse_controls(line: str) -> dict | None:
    parts = line.split(",")
    # Switches board: 4 pots + 5 toggles + battery mode
    if len(parts) != 11:
        return None
    try:
        battery = parts[10]
        if battery not in BATTERY_MODES:
            return None
        pots = {
            POT_KEYS[i]: float(parts[1 + i])
            for i in range(4)
        }
        toggles = {
            TOGGLE_KEYS[i]: parts[5 + i] == "1"
            for i in range(5)
        }
    except ValueError:
        return None
    return {
        "type": "controls_partial",
        "source": "switches",
        "pots": pots,
        "toggles": toggles,
        "battery": battery,
    }


def _parse_panel_pots(line: str) -> dict | None:
    parts = line.split(",")
    if len(parts) != 3:
        return None
    try:
        pots = {
            "gas": float(parts[1]),
            "batteryFlow": float(parts[2]),
        }
    except ValueError:
        return None
    return {
        "type": "controls_partial",
        "source": "buttons",
        "pots": pots,
    }


def _parse_switches(line: str) -> dict | None:
    parts = line.split(",")
    if len(parts) < 2:
        return None
    if parts[1] == "evt" and len(parts) == 3:
        return {"type": "button", "name": parts[2]}
    if parts[1] == "snap" and len(parts) >= 3:
        states = [p == "1" for p in parts[2:]]
        return {"type": "switches_snap", "states": states}
    return None


def _parse_panel(line: str) -> dict | None:
    parts = line.split(",")
    if len(parts) < 2:
        return None
    if parts[1] == "evt" and len(parts) == 3:
        return {"type": "button", "name": parts[2]}
    if parts[1] == "snap" and len(parts) >= 3:
        states = [p == "1" for p in parts[2:]]
        return {"type": "panel_snap", "states": states}
    return None
