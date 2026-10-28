#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-/dev/ttyACM1}"
FQBN="arduino:avr:uno"
SKETCH="$ROOT/arduino/panel_board"

arduino-cli compile --fqbn "$FQBN" "$SKETCH"
arduino-cli upload -p "$PORT" --fqbn "$FQBN" "$SKETCH"
echo "Panel board uploaded to $PORT"
