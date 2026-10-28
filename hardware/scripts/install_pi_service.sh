#!/usr/bin/env bash
# Install systemd units for Gen-I kiosk on Raspberry Pi.
# Run on the Pi:  sudo hardware/scripts/install_pi_service.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GENI_USER="${SUDO_USER:-$(whoami)}"

for unit in geni-bridge geni-static geni-kiosk; do
  sed -e "s|__GENI_ROOT__|${ROOT}|g" -e "s|__GENI_USER__|${GENI_USER}|g" \
    "$SCRIPT_DIR/${unit}.service" > "/tmp/${unit}.service"
  sudo cp "/tmp/${unit}.service" "/etc/systemd/system/${unit}.service"
done

sudo systemctl daemon-reload
sudo systemctl enable geni-bridge geni-static geni-kiosk
echo "Enabled geni-bridge, geni-static, geni-kiosk for user ${GENI_USER}"
echo "Start with: sudo systemctl start geni-bridge geni-static geni-kiosk"
echo ""
echo "For manual desktop launch (no auto-boot), run:"
echo "  ${ROOT}/hardware/scripts/install_desktop_launcher.sh"
