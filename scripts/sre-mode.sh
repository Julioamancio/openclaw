#!/bin/bash
set -euo pipefail

FILE="/root/.openclaw/workspace/sre-mode.json"
ACTION="${1:-get}"
MODE="${2:-}"

python3 - "$FILE" "$ACTION" "$MODE" <<'PY'
import json, sys
from datetime import datetime, timezone
p, action, mode = sys.argv[1:4]
valid={'observe','assist','autopilot'}
try:
    d=json.load(open(p))
except Exception:
    d={"version":1,"mode":"assist","updatedAt":datetime.now(timezone.utc).isoformat(),"notes":"observe|assist|autopilot"}

if action=='get':
    print(f"SRE_MODE={d.get('mode','assist')}")
    raise SystemExit

if action=='set':
    if mode not in valid:
        print('ERROR=invalid_mode')
        raise SystemExit(2)
    d['mode']=mode
    d['updatedAt']=datetime.now(timezone.utc).isoformat()
    json.dump(d, open(p,'w'), ensure_ascii=False, indent=2)
    print(f"SRE_MODE={mode}")
    raise SystemExit

print('ERROR=unknown_action')
raise SystemExit(1)
PY
