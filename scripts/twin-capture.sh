#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
LABEL="${1:-snapshot}"
OUT="$WORKSPACE/twin-state.json"

python3 - "$WORKSPACE" "$LABEL" "$OUT" <<'PY'
import json, sys, hashlib
from datetime import datetime, timezone
from pathlib import Path

ws = Path(sys.argv[1])
label = sys.argv[2]
out = Path(sys.argv[3])

tracked = [
  'mc-jobs.json',
  'mc-activity.json',
  'mc-alerts.json',
  'mc-postmortems.json',
  'incident-state.json',
  'mission-runs.json'
]


def sha256(p: Path):
    if not p.exists():
        return None
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()

snap = {
    'id': f"twin_{int(datetime.now(timezone.utc).timestamp())}",
    'label': label,
    'ts': datetime.now(timezone.utc).isoformat(),
    'files': []
}
for rel in tracked:
    p = ws / rel
    snap['files'].append({
        'path': rel,
        'exists': p.exists(),
        'sha256': sha256(p),
        'size': p.stat().st_size if p.exists() else 0
    })

try:
    data = json.loads(out.read_text(encoding='utf-8'))
except Exception:
    data = {'version': 1, 'snapshots': []}

data.setdefault('snapshots', [])
data['snapshots'].insert(0, snap)
data['snapshots'] = data['snapshots'][:200]
out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(snap, ensure_ascii=False))
PY
