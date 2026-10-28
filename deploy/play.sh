#!/bin/bash
# deploy/play.sh — what the desktop icon runs.
# Starts the game through hardware/scripts/start_geni.sh and reports the
# session (start, end, duration) via Telegram. If the Pi is offline, the
# messages wait in the queue and go out the next time it is online.

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$HOME/.pi-deploy.env" ] && source "$HOME/.pi-deploy.env"
source "$project_dir/deploy/telegram.sh"

start=$(date +%s)
tg_queue "🎮 Game started"
tg_flush &                      # deliver now if online, in the background so the game isn't delayed

# start_geni.sh ends with "exec chromium", so this line returns when the game window is closed.
"$project_dir/hardware/scripts/start_geni.sh"
code=$?

minutes=$(( ($(date +%s) - start) / 60 ))
tg_queue "🏁 Game ended after ${minutes} min (exit code $code)"
tg_flush
