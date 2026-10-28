#!/usr/bin/env bash
# Install a desktop shortcut to start Sončna hiška with one click.
# Run on the Pi as the desktop user (garazniuser), not root:
#   ./hardware/scripts/install_desktop_launcher.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET_USER="${SUDO_USER:-${USER:-$(whoami)}}"
TARGET_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"

DESKTOP_SRC="$SCRIPT_DIR/geni-game.desktop.in"
DESKTOP_OUT="$SCRIPT_DIR/geni-game.desktop"
DESKTOP_DIR="$TARGET_HOME/Desktop"
APPS_DIR="$TARGET_HOME/.local/share/applications"

chmod +x "$SCRIPT_DIR/start_geni.sh" "$SCRIPT_DIR/stop_geni.sh"

sed "s|__GENI_ROOT__|${ROOT}|g" "$DESKTOP_SRC" >"$DESKTOP_OUT"

mkdir -p "$DESKTOP_DIR" "$APPS_DIR"
install -m 755 "$DESKTOP_OUT" "$DESKTOP_DIR/Sončna-hiška.desktop"
install -m 644 "$DESKTOP_OUT" "$APPS_DIR/geni-game.desktop"

if command -v gio >/dev/null 2>&1; then
  gio set "$DESKTOP_DIR/Sončna-hiška.desktop" metadata::trusted true 2>/dev/null || true
fi

chown "$TARGET_USER:$TARGET_USER" \
  "$DESKTOP_DIR/Sončna-hiška.desktop" \
  "$APPS_DIR/geni-game.desktop" 2>/dev/null || true

echo "Desktop shortcut installed:"
echo "  $DESKTOP_DIR/Sončna-hiška.desktop"
echo ""
echo "Double-click 'Sončna hiška' on the desktop to start the game."
echo "Logs: $TARGET_HOME/.local/state/geni/"
