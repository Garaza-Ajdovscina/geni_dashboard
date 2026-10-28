"""Derive panel button press events from snap snapshots."""

from __future__ import annotations

DEFAULT_BUTTON_NAMES = (
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
    "ESC",
    "ENTER",
    "BACKSPACE",
    "SPEED_LEFT",
    "SPEED_RIGHT",
)


class SnapButtonDetector:
    """Emit button events on 0→1 transitions in P,snap state vectors."""

    def __init__(self, names: list[str] | tuple[str, ...] | None = None) -> None:
        self.names = list(names or DEFAULT_BUTTON_NAMES)
        self.prev: list[bool] = [False] * len(self.names)

    def edges(self, states: list[bool]) -> list[str]:
        fired: list[str] = []
        for i, on in enumerate(states):
            if i >= len(self.names):
                break
            if on and not self.prev[i]:
                fired.append(self.names[i])
            self.prev[i] = on
        return fired
