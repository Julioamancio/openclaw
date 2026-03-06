#!/bin/bash
set -euo pipefail

CRON_LINE="*/5 * * * * /root/.openclaw/workspace/scripts/dispatch-mc-alerts.sh >/tmp/dispatch-mc-alerts.log 2>&1"

( crontab -l 2>/dev/null | grep -v 'dispatch-mc-alerts.sh' ; echo "$CRON_LINE" ) | crontab -

echo "[cron] dispatch-mc-alerts instalado: a cada 5 minutos"
crontab -l | grep dispatch-mc-alerts.sh || true
