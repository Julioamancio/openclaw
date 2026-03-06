#!/usr/bin/env bash
set -euo pipefail
LOG="/var/log/mysql/mariadb-slow.log"
if [ ! -f "$LOG" ]; then
  echo "Slow log não encontrado: $LOG"
  exit 1
fi

if command -v mysqldumpslow >/dev/null 2>&1; then
  echo "== Top 20 slow queries (mysqldumpslow) =="
  mysqldumpslow -s t -t 20 "$LOG"
else
  echo "mysqldumpslow não encontrado. Mostrando últimos blocos do slow log:"
  tail -n 200 "$LOG"
fi
