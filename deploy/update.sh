#!/bin/bash
# deploy/update.sh — keeps the game on the garage Pi in sync with GitHub.
#
# Run by cron at boot and every 5 minutes (installed by deploy/bootstrap.sh).
#   offline        -> exits quietly, cron tries again later
#   game running   -> postpones, so files never change under a player
#   otherwise      -> pulls main, refreshes dependencies that changed, rebuilds
#                     the web app when needed, stops the background helpers so
#                     start_geni.sh relaunches them with fresh code, and reports
#                     via Telegram
# Everything is inside main() so the script can safely replace itself mid-run.

main() {
    export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"
    local project_dir branch log
    project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    branch="main"
    log="$HOME/update.log"

    [ -f "$HOME/.pi-deploy.env" ] && source "$HOME/.pi-deploy.env"
    source "$project_dir/deploy/telegram.sh"

    logmsg() { echo "$(date '+%F %T') $*" >> "$log"; }

    # Never run two copies at once (npm/pip can take a while)
    exec 9>"$HOME/.update.lock"
    flock -n 9 || exit 0

    cd "$project_dir" || { logmsg "project dir $project_dir not found"; exit 1; }

    # Offline? Nothing to do until next time.
    git fetch --quiet origin "$branch" 2>>"$log" || exit 0

    # Online: deliver anything queued while offline (play sessions etc.)
    tg_flush

    local local_rev remote_rev
    local_rev=$(git rev-parse HEAD)
    remote_rev=$(git rev-parse "origin/$branch")
    [ "$local_rev" = "$remote_rev" ] && exit 0

    # Chromium showing the game means someone is playing: retry in 5 minutes.
    if pgrep -f "app=http://127.0.0.1:8080" >/dev/null; then
        logmsg "update available but game is running, postponing"
        exit 0
    fi

    local changed
    changed=$(git diff --name-only "$local_rev" "$remote_rev")
    git reset --hard --quiet "origin/$branch"
    chmod +x deploy/*.sh hardware/scripts/*.sh 2>/dev/null
    logmsg "updated ${local_rev:0:7} -> ${remote_rev:0:7}: $(git log -1 --pretty=%s)"

    # Stop the background helpers; start_geni.sh starts them again on next launch.
    pkill -f "bridge/bridge.py" 2>/dev/null
    pkill -f "http.server 8080" 2>/dev/null

    local report="🔄 Pi updated to ${remote_rev:0:7}: $(git log -1 --pretty=%s)"

    # Python packages for the hardware bridge
    if grep -qx 'hardware/requirements.txt' <<<"$changed" || [ ! -x hardware/.venv/bin/python ]; then
        [ -d hardware/.venv ] || python3 -m venv hardware/.venv
        if hardware/.venv/bin/pip install -q -r hardware/requirements.txt >>"$log" 2>&1; then
            logmsg "pip packages installed";  report+=" · ✅ Python packages"
        else
            logmsg "pip install FAILED";      report+=" · ❌ pip install failed"
        fi
    fi

    # Node packages
    if grep -qE '^package(-lock)?\.json$' <<<"$changed" || [ ! -d node_modules ]; then
        if npm install --no-audit --no-fund >>"$log" 2>&1; then
            logmsg "npm packages installed";  report+=" · ✅ Node packages"
        else
            logmsg "npm install FAILED";      report+=" · ❌ npm install failed"
        fi
    fi

    # Rebuild the web app when anything outside hardware/, deploy/ and docs changed
    if [ ! -f dist/index.html ] || grep -qvE '^(hardware/|deploy/|\.github/|\.gitignore$|LICENSE$|.*\.md$)' <<<"$changed"; then
        if npm run build >>"$log" 2>&1; then
            logmsg "web app rebuilt";         report+=" · ✅ Web app rebuilt"
        else
            logmsg "BUILD FAILED";            report+=" · ❌ build failed, game may not start"
        fi
    fi

    if grep -qE '^hardware/arduino/' <<<"$changed"; then
        report+=" · ℹ️ Arduino sketches changed: flash by hand with upload_*.sh"
    fi

    tg_queue "$report"
    tg_flush
}

main "$@"
