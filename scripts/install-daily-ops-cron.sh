#!/bin/bash
set -euo pipefail

CRON_LINE="10 1 * * * /root/.openclaw/workspace/scripts/daily-ops-report.sh >/tmp/daily-ops-report.log 2>&1"

( crontab -l 2>/dev/null | grep -v 'daily-ops-report.sh' ; echo "$CRON_LINE" ) | crontab -

echo "[cron] daily-ops-report instalado: 01:10 UTC (22:10 BRT)"
crontab -l | grep daily-ops-report.sh || true
