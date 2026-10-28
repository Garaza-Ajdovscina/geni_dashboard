#!/bin/bash
# deploy/bootstrap.sh — sets up a Raspberry Pi (Raspberry Pi OS Bookworm or newer,
# desktop edition) to run Sončna hiška and keep itself updated from GitHub.
#
# Safe to run again at any time; it only fixes what is missing or outdated.
#
# Fresh Pi, straight from GitHub:
#   curl -fsSL https://raw.githubusercontent.com/Garaza-Ajdovscina/geni_dashboard/main/deploy/bootstrap.sh | bash
# Existing clone:
#   deploy/bootstrap.sh
#
# Afterwards: reboot once, then double-click "Sončna hiška" on the desktop.
# Arduino firmware is flashed separately with hardware/scripts/upload_*.sh.

set -euo pipefail

REPO_URL="https://github.com/Garaza-Ajdovscina/geni_dashboard.git"
BRANCH="main"
PROJECT_DIR="${PROJECT_DIR:-$HOME/geni_project/geni_dashboard}"
ENV_FILE="$HOME/.pi-deploy.env"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

say "System packages"
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    git curl chromium python3 python3-venv python3-pip nodejs npm libnotify-bin

say "Repository at $PROJECT_DIR"
if [ -d "$PROJECT_DIR/.git" ]; then
    git -C "$PROJECT_DIR" fetch origin "$BRANCH"
    git -C "$PROJECT_DIR" reset --hard "origin/$BRANCH"
else
    mkdir -p "$(dirname "$PROJECT_DIR")"
    git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
fi
cd "$PROJECT_DIR"
chmod +x deploy/*.sh hardware/scripts/*.sh

say "Python environment for the hardware bridge"
[ -d hardware/.venv ] || python3 -m venv hardware/.venv
hardware/.venv/bin/pip install -q -r hardware/requirements.txt

say "Node packages and web app build"
npm install --no-audit --no-fund
npm run build

say "Serial port access and udev rule for the Arduinos"
sudo usermod -aG dialout "$(id -un)"
sudo install -m 644 hardware/scripts/99-geni-arduino.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules

say "Desktop launcher"
mkdir -p "$HOME/Desktop"
cat > "$HOME/Desktop/Sončna-hiška.desktop" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Sončna hiška
Comment=Zaženi energetsko igro Gen-I
Exec=$PROJECT_DIR/deploy/play.sh
Icon=chromium
Terminal=false
Categories=Game;Education;
StartupNotify=true
EOF
chmod +x "$HOME/Desktop/Sončna-hiška.desktop"

say "Telegram notifications"
if [ -f "$ENV_FILE" ]; then
    echo "Keeping existing $ENV_FILE"
elif [ -r /dev/tty ]; then
    read -rp "Telegram bot token (from @BotFather; leave empty to skip): " token </dev/tty
    chat=""
    [ -n "$token" ] && read -rp "Telegram chat id: " chat </dev/tty
    printf 'TELEGRAM_TOKEN="%s"\nTELEGRAM_CHAT_ID="%s"\n' "$token" "$chat" > "$ENV_FILE"
    chmod 600 "$ENV_FILE"
else
    echo "No terminal available; skipping. Create $ENV_FILE by hand (see deploy/pi-deploy.env.example)."
fi

say "Cron: check GitHub at boot and every 5 minutes"
( crontab -l 2>/dev/null | grep -v 'deploy/update.sh' || true
  echo "@reboot sleep 60 && $PROJECT_DIR/deploy/update.sh"
  echo "*/5 * * * * $PROJECT_DIR/deploy/update.sh"
) | crontab -

say "Done"
echo "Reboot once so group membership and the udev rule take effect:  sudo reboot"
echo "Then double-click \"Sončna hiška\" on the desktop. Updates arrive by themselves."
