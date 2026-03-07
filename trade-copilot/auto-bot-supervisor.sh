#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/root/.openclaw/workspace/trade-copilot"
LOG_DIR="$BASE_DIR/data"
SUP_LOG="$LOG_DIR/auto-supervisor.log"
export ACCOUNT_BALANCE=${ACCOUNT_BALANCE:-10000}
BOT_CMD="node $BASE_DIR/auto-bot.js"

mkdir -p "$LOG_DIR"

echo "[$(date -Is)] supervisor:start" >> "$SUP_LOG"

while true; do
  echo "[$(date -Is)] supervisor:launch bot" >> "$SUP_LOG"
  $BOT_CMD >> /tmp/trade-copilot-auto.log 2>&1
  code=$?
  echo "[$(date -Is)] supervisor:bot-exit code=$code; restart in 3s" >> "$SUP_LOG"
  sleep 3
done
