#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
LIB="$WORKSPACE/replay-library.json"
SCENARIO_ID="${1:-}"
DRY_RUN="${2:-1}"

if [ -z "$SCENARIO_ID" ]; then
  echo "Uso: replay-run.sh <scenario_id> [dry_run:1|0]"
  exit 1
fi

python3 - "$WORKSPACE" "$LIB" "$SCENARIO_ID" "$DRY_RUN" <<'PY'
import json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ws, lib_path, sid, dry_run = sys.argv[1:5]
dry = dry_run in ('1','true','True')

lib = json.loads(Path(lib_path).read_text(encoding='utf-8'))
scenarios = lib.get('scenarios', [])
sc = next((x for x in scenarios if str(x.get('id','')) == sid), None)
if not sc:
    print(json.dumps({'ok': False, 'error': 'scenario not found', 'scenarioId': sid}))
    raise SystemExit(2)

incident_id = f"replay_{sid}_{int(datetime.now(timezone.utc).timestamp())}"
risk = str(sc.get('risk', 'medium'))
command = str(sc.get('command', 'echo replay-noop'))

status = 'done'
notes = ''

if dry:
    notes = f"dry_run: {command}"
else:
    proc = subprocess.run(
        ['/root/.openclaw/workspace/scripts/command-bus.sh', 'auto_heal', incident_id, sc.get('mission', sid), risk, command],
        capture_output=True, text=True, timeout=240
    )
    status = 'done' if proc.returncode == 0 else 'failed'
    notes = (proc.stdout or proc.stderr or '').strip()[:500]

result = {
    'id': incident_id,
    'scenarioId': sid,
    'name': sc.get('name', sid),
    'risk': risk,
    'dryRun': dry,
    'status': status,
    'ts': datetime.now(timezone.utc).isoformat(),
    'notes': notes
}
print(json.dumps(result, ensure_ascii=False))
PY
