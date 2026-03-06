#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
AUDIT_FILE="$WORKSPACE/audit-log.jsonl"

TYPE="${1:-event}"
ACTOR="${2:-system}"
TASK="${3:-unknown}"
RISK="${4:-unknown}"
STRATEGY="${5:-none}"
RESULT="${6:-unknown}"
NOTES="${7:-}"

python3 - "$AUDIT_FILE" "$TYPE" "$ACTOR" "$TASK" "$RISK" "$STRATEGY" "$RESULT" "$NOTES" <<'PY'
import json, sys
from datetime import datetime, timezone

path, typ, actor, task, risk, strategy, result, notes = sys.argv[1:9]
entry = {
  "ts": datetime.now(timezone.utc).isoformat(),
  "type": typ,
  "actor": actor,
  "task": task,
  "risk": risk,
  "strategy": strategy,
  "result": result,
  "notes": notes
}
with open(path, 'a', encoding='utf-8') as f:
  f.write(json.dumps(entry, ensure_ascii=False) + "\n")
PY

echo "[audit-event] $TYPE $TASK $RESULT"
