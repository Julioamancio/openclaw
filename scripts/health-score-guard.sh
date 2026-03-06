#!/bin/bash
set -euo pipefail

BASE_URL="http://127.0.0.1:8899"
THRESHOLD="${HEALTH_SCORE_THRESHOLD:-80}"
STAMP_FILE="/tmp/health-score-guard-stamp"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
TARGET="${MC_ALERT_TARGET:-720093594}"

raw=$(curl -fsS "$BASE_URL/mc/health-score" 2>/dev/null || true)
if [ -z "$raw" ]; then
  echo "[health-score-guard] sem resposta"
  exit 0
fi

score=$(RAW="$raw" python3 - <<'PY'
import json, os
try:
 d=json.loads(os.environ.get('RAW','{}'))
 print(int(d.get('score',0)))
except Exception:
 print(0)
PY
)

if [ "$score" -ge "$THRESHOLD" ]; then
  echo "[health-score-guard] ok score=$score"
  exit 0
fi

# rate-limit alert: once per 60 min
now=$(date +%s)
last=0
[ -f "$STAMP_FILE" ] && last=$(cat "$STAMP_FILE" 2>/dev/null || echo 0)
if [ $((now-last)) -lt 3600 ]; then
  echo "[health-score-guard] suppressed score=$score"
  exit 0
fi

echo "$now" > "$STAMP_FILE"
msg="⚠️ *Health Score abaixo do limite*\n\nScore: $score/100\nThreshold: $THRESHOLD\nAção recomendada: revisar jobs falhos e postmortems abertos."

if command -v openclaw >/dev/null 2>&1; then
  openclaw message send --channel "$CHANNEL" --to "$TARGET" --message "$msg" >/dev/null 2>&1 || true
fi

# also activity alert queue
curl -fsS -X POST "$BASE_URL/mc/activity" -H "Content-Type: application/json" \
  -d "{\"title\":\"Health Score Guard\",\"message\":\"ALERTA: Health Score abaixo de ${THRESHOLD} (atual ${score})\"}" >/dev/null 2>&1 || true

echo "[health-score-guard] alert sent score=$score"
