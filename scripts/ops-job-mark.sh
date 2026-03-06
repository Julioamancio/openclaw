#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
JOBS_FILE="$WORKSPACE/mc-jobs.json"
ACTIVITY_FILE="$WORKSPACE/mc-activity.json"
POSTMORTEMS_FILE="$WORKSPACE/mc-postmortems.json"

TASK="${1:-}"
STATUS="${2:-}"
AGENT="${3:-Sistema}"
NOTES="${4:-}"
DEDUP_MIN="${MC_ALERT_DEDUP_MIN:-30}"

if [ -z "$TASK" ] || [ -z "$STATUS" ]; then
  echo "Uso: ops-job-mark.sh <task> <status> [agent] [notes]"
  exit 1
fi

# Classificação de severidade por tipo de job
SEVERITY="warning"
case "$TASK" in
  *"Backup GitHub"*|*"OTServer"*|*"gateway"*|*"Gateway"*)
    SEVERITY="critical"
    ;;
  *"Check remetentes"*|*"Ideia de Negócio"*|*"Heartbeat técnico"*)
    SEVERITY="warning"
    ;;
  *)
    SEVERITY="warning"
    ;;
esac

# Atualiza jobs/runs + dedup + fechamento automático de postmortem
PY_OUT=$(python3 - "$JOBS_FILE" "$ACTIVITY_FILE" "$POSTMORTEMS_FILE" "$TASK" "$STATUS" "$AGENT" "$NOTES" "$DEDUP_MIN" "$SEVERITY" <<'PY'
import json, sys, os
from datetime import datetime, timezone, timedelta

jobs_file, activity_file, pm_file, task, status, agent, notes, dedup_min, severity = sys.argv[1:10]
now = datetime.now(timezone.utc)
now_iso = now.isoformat()
dedup_window = timedelta(minutes=int(dedup_min))

def load_json(path, fallback):
    if not os.path.exists(path):
        return fallback
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return fallback

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# jobs/runs
jobs_data = load_json(jobs_file, {"jobs": [], "runs": []})
jobs = jobs_data.setdefault("jobs", [])
runs = jobs_data.setdefault("runs", [])

j = next((x for x in jobs if x.get("task") == task), None)
if not j:
    j = {"task": task, "schedule": "manual", "agent": agent, "status": status, "lastRun": now_iso, "notes": notes}
    jobs.append(j)
else:
    j["status"] = status
    j["agent"] = agent or j.get("agent") or "Sistema"
    j["lastRun"] = now_iso
    j["notes"] = notes

runs.insert(0, {"ts": now_iso, "task": task, "status": status, "agent": agent, "notes": notes})
jobs_data["runs"] = runs[:300]
save_json(jobs_file, jobs_data)

# dedup de alerta por severidade+task
should_alert = False
if status == 'failed':
    activity = load_json(activity_file, [])
    target_msg = f"ALERTA: [{severity}] {task} falhou"
    recent_same = False
    if isinstance(activity, list):
        for a in reversed(activity[-300:]):
            if a.get('message') != target_msg:
                continue
            ts = a.get('timestamp')
            if not ts:
                continue
            try:
                dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            except Exception:
                continue
            if now - dt <= dedup_window:
                recent_same = True
                break
    should_alert = not recent_same

# fechamento automático de postmortem ao normalizar
closed = 0
if status in ('done', 'pending'):
    pms = load_json(pm_file, [])
    if isinstance(pms, list):
        for p in pms:
            if p.get('status') != 'open':
                continue
            incident = str(p.get('incident', ''))
            if task in incident and 'falhou' in incident:
                p['status'] = 'closed'
                prev_action = str(p.get('action_taken', '')).strip()
                suffix = f"Auto-closed em {now_iso} após status '{status}'"
                p['action_taken'] = (prev_action + ' | ' + suffix).strip(' |')
                closed += 1
        save_json(pm_file, pms)

print(f"SHOULD_ALERT={1 if should_alert else 0}")
print(f"CLOSED_PM={closed}")
PY
)

# Best-effort activity sync do run
if command -v curl >/dev/null 2>&1; then
  curl -sS -X POST "http://127.0.0.1:8899/mc/activity" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Ops Job\",\"message\":\"${TASK} -> ${STATUS}\",\"meta\":{\"agent\":\"${AGENT}\",\"notes\":\"${NOTES}\",\"severity\":\"info\"}}" >/dev/null 2>&1 || true
fi

SHOULD_ALERT=$(echo "$PY_OUT" | awk -F= '/^SHOULD_ALERT=/{print $2}')
CLOSED_PM=$(echo "$PY_OUT" | awk -F= '/^CLOSED_PM=/{print $2}')

# dispara alerta explícito quando houver falha (com dedup)
if [ "$STATUS" = "failed" ] && [ "${SHOULD_ALERT:-0}" = "1" ]; then
  if command -v curl >/dev/null 2>&1; then
    curl -sS -X POST "http://127.0.0.1:8899/mc/activity" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"Ops Job\",\"message\":\"ALERTA: [${SEVERITY}] ${TASK} falhou\",\"meta\":{\"agent\":\"${AGENT}\",\"notes\":\"${NOTES}\",\"severity\":\"${SEVERITY}\"}}" >/dev/null 2>&1 || true
  fi
fi

echo "[ops-job-mark] ${TASK} -> ${STATUS} (severity=${SEVERITY}, closed_pm=${CLOSED_PM:-0}, alert=${SHOULD_ALERT:-0})"
