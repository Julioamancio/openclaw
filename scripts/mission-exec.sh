#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
MISSION="${*:-}"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
TARGET="${MC_ALERT_TARGET:-720093594}"

if [ -z "$MISSION" ]; then
  echo "Uso: mission-exec.sh \"objetivo\""
  exit 1
fi

PAYLOAD=$(python3 - <<PY
import json
print(json.dumps({"mission": """$MISSION""", "requestedBy": "Mike"}, ensure_ascii=False))
PY
)

RESP=$(curl -fsS -X POST http://127.0.0.1:8899/mc/mission-execute \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

STATUS=$(printf "%s" "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status","unknown"))')
RUN_ID=$(printf "%s" "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id","n/a"))')

/root/.openclaw/workspace/scripts/audit-event.sh "mission_exec" "Mike" "$MISSION" "medium" "mission-api" "$STATUS" "mission execute via API ($RUN_ID)" >/dev/null 2>&1 || true

if command -v openclaw >/dev/null 2>&1; then
  MSG="🎯 *Mission Executor*\n\nMissão: $MISSION\nStatus: $STATUS\nRun: $RUN_ID\nDetalhes: /mc/mission-runs"
  openclaw message send --channel "$CHANNEL" --to "$TARGET" --message "$MSG" >/dev/null 2>&1 || true
fi

echo "[mission-exec] id=$RUN_ID status=$STATUS"