#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
METRICS_FILE="$WORKSPACE/router-metrics.json"
MODEL="${1:-}"
STATUS="${2:-}"
LAT_MS="${3:-0}"
ROUTE="${4:-unknown}"

if [ -z "$MODEL" ] || [ -z "$STATUS" ]; then
  echo "Uso: router-metrics-update.sh <model> <status> <latency_ms> [route]"
  exit 1
fi

python3 - "$METRICS_FILE" "$MODEL" "$STATUS" "$LAT_MS" "$ROUTE" <<'PY'
import json, sys
from datetime import datetime, timezone

path, model, status, lat, route = sys.argv[1:6]
lat = int(float(lat or 0))

try:
    data = json.load(open(path))
except Exception:
    data = {"version": 1, "models": {}}

models = data.setdefault("models", {})
m = models.setdefault(model, {
    "attempts": 0,
    "success": 0,
    "failed": 0,
    "failStreak": 0,
    "avgLatencyMs": 0,
    "lastStatus": "unknown",
    "lastRoute": "unknown",
    "lastAt": None
})

m["attempts"] += 1
if status in ("ok", "spawned", "routed"):
    m["success"] += 1
    m["failStreak"] = 0
else:
    m["failed"] += 1
    m["failStreak"] += 1

prev = float(m.get("avgLatencyMs", 0) or 0)
if prev <= 0:
    m["avgLatencyMs"] = lat
else:
    m["avgLatencyMs"] = round(prev * 0.7 + lat * 0.3, 2)

m["lastStatus"] = status
m["lastRoute"] = route
m["lastAt"] = datetime.now(timezone.utc).isoformat()

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("[router-metrics] updated")
PY
