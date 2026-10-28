#!/usr/bin/env bash
# Start Sončna hiška on the Pi desktop: static server, hardware bridge, Chromium.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST="$ROOT/dist"
HW="$ROOT/hardware"
VENV_PY="$HW/.venv/bin/python"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/geni"
URL="http://127.0.0.1:8080/?hardware=1"

export DISPLAY="${DISPLAY:-:0}"

mkdir -p "$LOG_DIR"

if [[ ! -f "$DIST/index.html" ]]; then
  notify-send "Sončna hiška" "Manjka dist/. V terminalu zaženi: npm run build" 2>/dev/null \
    || echo "Missing $DIST/index.html — run: cd $ROOT && npm run build" >&2
  exit 1
fi

if [[ ! -x "$VENV_PY" ]]; then
  notify-send "Sončna hiška" "Manjka hardware/.venv. Glej hardware/README_HARDWARE.md" 2>/dev/null \
    || echo "Missing $VENV_PY — create venv and pip install -r requirements.txt" >&2
  exit 1
fi

start_static() {
  if pgrep -f "python3 -m http.server 8080 --bind 127.0.0.1" >/dev/null 2>&1; then
    return 0
  fi
  (
    cd "$DIST"
    nohup python3 -m http.server 8080 --bind 127.0.0.1 \
      >>"$LOG_DIR/static.log" 2>&1 \
      </dev/null &
    echo $! >"$LOG_DIR/static.pid"
  )
}

start_bridge() {
  if pgrep -f "$HW/bridge/bridge.py" >/dev/null 2>&1 || pgrep -f "bridge/bridge.py" >/dev/null 2>&1; then
    return 0
  fi
  (
    cd "$HW"
    export PYTHONPATH="$HW/bridge"
    nohup "$VENV_PY" bridge/bridge.py >>"$LOG_DIR/bridge.log" 2>&1 </dev/null &
    echo $! >"$LOG_DIR/bridge.pid"
  )
}

wait_for_http() {
  local i
  for i in $(seq 1 40); do
    if curl -sf --max-time 1 "$URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  notify-send "Sončna hiška" "Strežnik na portu 8080 se ne odziva." 2>/dev/null \
    || echo "HTTP server on 8080 did not respond" >&2
  return 1
}

start_static
start_bridge
wait_for_http

exec chromium --password-store=basic --app="$URL"
