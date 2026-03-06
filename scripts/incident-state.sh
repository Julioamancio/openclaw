#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
STATE_FILE="$WORKSPACE/incident-state.json"

ACTION="${1:-}"
INCIDENT_ID="${2:-}"
NEW_STATE="${3:-}"
NOTES="${4:-}"

if [ -z "$ACTION" ] || [ -z "$INCIDENT_ID" ]; then
  echo "Uso: incident-state.sh <upsert|transition|get> <incident_id> [state] [notes]"
  exit 1
fi

python3 - "$STATE_FILE" "$ACTION" "$INCIDENT_ID" "$NEW_STATE" "$NOTES" <<'PY'
import json, sys
from datetime import datetime, timezone

path, action, iid, new_state, notes = sys.argv[1:6]
allowed = {
    'detected': {'assessed'},
    'assessed': {'approved','blocked','escalated'},
    'approved': {'healed','escalated'},
    'blocked': {'approved','escalated'},
    'healed': {'closed'},
    'escalated': {'closed'},
    'closed': set()
}

def now(): return datetime.now(timezone.utc).isoformat()

try:
    data=json.load(open(path))
except Exception:
    data={"version":1,"incidents":{}}

inc=data.setdefault('incidents',{}).setdefault(iid,{
    'id': iid,
    'state': 'detected',
    'createdAt': now(),
    'updatedAt': now(),
    'history': []
})

if action=='get':
    print(json.dumps(inc, ensure_ascii=False))
    raise SystemExit

if action=='upsert':
    state = new_state or inc.get('state','detected')
    inc['state']=state
    inc['updatedAt']=now()
    inc.setdefault('history',[]).append({'ts':now(),'action':'upsert','to':state,'notes':notes})
    json.dump(data, open(path,'w'), ensure_ascii=False, indent=2)
    print(f"INCIDENT_ID={iid}")
    print(f"STATE={state}")
    raise SystemExit

if action=='transition':
    cur=inc.get('state','detected')
    if not new_state:
        print('ERROR=missing_state')
        raise SystemExit(2)
    if new_state not in allowed.get(cur,set()):
        print(f"ERROR=invalid_transition:{cur}->{new_state}")
        raise SystemExit(3)
    inc['state']=new_state
    inc['updatedAt']=now()
    inc.setdefault('history',[]).append({'ts':now(),'action':'transition','from':cur,'to':new_state,'notes':notes})
    json.dump(data, open(path,'w'), ensure_ascii=False, indent=2)
    print(f"INCIDENT_ID={iid}")
    print(f"STATE={new_state}")
    raise SystemExit

print('ERROR=unknown_action')
raise SystemExit(1)
PY
