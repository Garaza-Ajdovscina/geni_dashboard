#!/usr/bin/env bash
# Stop background Sončna hiška services started by start_geni.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/geni"

stop_pidfile() {
  local name="$1"
  local file="$LOG_DIR/${name}.pid"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$file"
  fi
}

pkill -f "python3 -m http.server 8080 --bind 127.0.0.1" 2>/dev/null || true
pkill -f "bridge/bridge.py" 2>/dev/null || true
stop_pidfile static
stop_pidfile bridge

echo "Gen-I strežnik in bridge ustavljena."
