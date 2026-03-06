#!/bin/bash
set -euo pipefail

STATE="/root/.openclaw/workspace/jarvis-state.json"
TYPE="${1:-event}"
ENTITY="${2:-system}"
PAYLOAD="${3:-{}}"

python3 - "$STATE" "$TYPE" "$ENTITY" "$PAYLOAD" <<'PY'
import json,sys,time
from datetime import datetime, timezone
p,typ,entity,payload_raw = sys.argv[1:5]
try:
  st=json.load(open(p))
except Exception:
  st={"version":1,"events":[],"snapshots":[]}
try:
  payload=json.loads(payload_raw)
except Exception:
  payload={"raw": payload_raw}

ev={
  "id": f"ev_{int(time.time()*1000)}",
  "ts": datetime.now(timezone.utc).isoformat(),
  "type": typ,
  "entity": entity,
  "payload": payload
}
st.setdefault('events',[]).append(ev)
if len(st['events']) % 20 == 0:
  st.setdefault('snapshots',[]).insert(0,{"ts":ev['ts'],"events":len(st['events'])})
  st['snapshots']=st['snapshots'][:200]
st['events']=st['events'][-5000:]
json.dump(st, open(p,'w'), ensure_ascii=False, indent=2)
print(json.dumps(ev, ensure_ascii=False))
PY
