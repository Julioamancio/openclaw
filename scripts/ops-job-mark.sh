#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
JOBS_FILE="$WORKSPACE/mc-jobs.json"

TASK="${1:-}"
STATUS="${2:-}"
AGENT="${3:-Sistema}"
NOTES="${4:-}"

if [ -z "$TASK" ] || [ -z "$STATUS" ]; then
  echo "Uso: ops-job-mark.sh <task> <status> [agent] [notes]"
  exit 1
fi

python3 - "$JOBS_FILE" "$TASK" "$STATUS" "$AGENT" "$NOTES" <<'PY'
import json, sys, os
from datetime import datetime, timezone

file, task, status, agent, notes = sys.argv[1:6]
now = datetime.now(timezone.utc).isoformat()

if os.path.exists(file):
    try:
        data = json.load(open(file, 'r', encoding='utf-8'))
    except Exception:
        data = {"jobs": [], "runs": []}
else:
    data = {"jobs": [], "runs": []}

jobs = data.setdefault("jobs", [])
runs = data.setdefault("runs", [])

j = next((x for x in jobs if x.get("task") == task), None)
if not j:
    j = {"task": task, "schedule": "manual", "agent": agent, "status": status, "lastRun": now, "notes": notes}
    jobs.append(j)
else:
    j["status"] = status
    j["agent"] = agent or j.get("agent") or "Sistema"
    j["lastRun"] = now
    j["notes"] = notes

runs.insert(0, {"ts": now, "task": task, "status": status, "agent": agent, "notes": notes})
data["runs"] = runs[:300]

with open(file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
PY

# best-effort activity sync
if command -v curl >/dev/null 2>&1; then
  curl -sS -X POST "http://127.0.0.1:8899/mc/activity" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Ops Job\",\"message\":\"${TASK} -> ${STATUS}\",\"meta\":{\"agent\":\"${AGENT}\",\"notes\":\"${NOTES}\"}}" >/dev/null 2>&1 || true
fi

echo "[ops-job-mark] ${TASK} -> ${STATUS}"
