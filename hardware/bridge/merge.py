"""Merge partial hardware state from two Arduino boards into one GUI message."""

from __future__ import annotations

POT_KEYS = ("nuclear", "hydro", "gas", "batteryFlow")
TOGGLE_KEYS = ("solar", "wind", "nuclear", "hydro", "gas")
BATTERY_MODES = frozenset({"charge", "discharge", "off"})


def _scale_pot(raw: float, cal: dict) -> float:
    raw_min = float(cal.get("raw_min", 0))
    raw_max = float(cal.get("raw_max", 1023))
    if raw_max <= raw_min:
        return 0.0
    clamped = max(raw_min, min(raw_max, raw))
    pct = (clamped - raw_min) * 100.0 / (raw_max - raw_min)
    if cal.get("invert"):
        pct = 100.0 - pct
    return round(pct, 1)


class ControlsMerger:
    """Switches board → all 4 pots + toggles + battery.
    Buttons board → panel button events only."""

    def __init__(self, cfg: dict) -> None:
        self.pot_cfg = cfg.get("pot_calibration", {})
        self.pot_remap: dict[str, str] = cfg.get("pot_remap", {})
        self.raw_pots: dict[str, float] = {key: 0.0 for key in POT_KEYS}
        self.toggles: dict[str, bool] = {key: False for key in TOGGLE_KEYS}
        self.battery = "off"

    def update_switches_board(self, msg: dict) -> dict:
        for key in POT_KEYS:
            self.raw_pots[key] = float(msg["pots"][key])
        self.toggles = dict(msg["toggles"])
        self.battery = msg["battery"]
        return self.build_message()

    def build_message(self) -> dict:
        scaled = {
            key: _scale_pot(self.raw_pots[key], self.pot_cfg.get(key, {}))
            for key in POT_KEYS
        }
        if self.pot_remap:
            pots = {
                game: scaled.get(self.pot_remap.get(game, game), 0.0)
                for game in POT_KEYS
            }
        else:
            pots = scaled
        battery = self.battery if self.battery in BATTERY_MODES else "off"
        return {
            "type": "controls",
            "pots": pots,
            "toggles": dict(self.toggles),
            "battery": battery,
        }
