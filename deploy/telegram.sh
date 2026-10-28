#!/bin/bash
# deploy/telegram.sh — sourced by update.sh and play.sh; not run directly.
# Needs TELEGRAM_TOKEN and TELEGRAM_CHAT_ID from ~/.pi-deploy.env (created by
# bootstrap.sh). Messages are queued in ~/.tg-queue while the Pi is offline and
# delivered the next time it is online. Without a token, nothing is queued.

TG_QUEUE="$HOME/.tg-queue"

# tg_send "text"  -> returns 0 only if Telegram accepted the message
tg_send() {
    [ -n "${TELEGRAM_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 1
    curl -fsS -m 15 "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=$1" >/dev/null 2>&1
}

# tg_queue "text" -> stores a one-line message, stamped with the current time, for later delivery
tg_queue() {
    [ -n "${TELEGRAM_TOKEN:-}" ] || return 0
    echo "$(date '+%a %d.%m. %H:%M') · $1" >> "$TG_QUEUE"
}

# tg_flush -> sends queued messages in order; stops at the first failure and keeps the rest
tg_flush() {
    [ -s "$TG_QUEUE" ] || return 0
    local tmp sent=0
    tmp=$(mktemp) && mv "$TG_QUEUE" "$tmp" || return 1
    while IFS= read -r line; do
        tg_send "$line" || break
        sent=$((sent + 1))
    done < "$tmp"
    tail -n +$((sent + 1)) "$tmp" >> "$TG_QUEUE"
    rm -f "$tmp"
}
