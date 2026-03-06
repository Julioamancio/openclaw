#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
CHANGELOG="$WORKSPACE/OPERATIONS_CHANGELOG.md"
AUDIT="$WORKSPACE/audit-log.jsonl"
JOBS="$WORKSPACE/mc-jobs.json"

python3 - <<'PY'
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

workspace=Path('/root/.openclaw/workspace')
changelog=workspace/'OPERATIONS_CHANGELOG.md'
audit=workspace/'audit-log.jsonl'
jobs=workspace/'mc-jobs.json'

now=datetime.now(timezone.utc)
start=now-timedelta(hours=24)

def parse_iso(v):
    try:
        return datetime.fromisoformat(str(v).replace('Z','+00:00'))
    except Exception:
        return None

entries=[]
if audit.exists():
    for line in audit.read_text(encoding='utf-8').splitlines():
        line=line.strip()
        if not line:
            continue
        try:
            obj=json.loads(line)
        except Exception:
            continue
        ts=parse_iso(obj.get('ts'))
        if ts and ts>=start:
            entries.append(obj)

jobs_data={'jobs':[],'runs':[]}
if jobs.exists():
    try:
        jobs_data=json.loads(jobs.read_text(encoding='utf-8'))
    except Exception:
        pass

lines=[]
lines.append(f"## {now.strftime('%Y-%m-%d')} (UTC)")
lines.append('')

# resumo jobs
job_list=jobs_data.get('jobs',[])
if job_list:
    lines.append('### Job Snapshot')
    for j in job_list[:10]:
        lines.append(f"- {j.get('task','?')}: {j.get('status','?')} (lastRun: {j.get('lastRun','--')})")
    lines.append('')

# resumo audit 24h
if entries:
    lines.append('### Audit Events (last 24h)')
    for e in entries[-30:]:
        lines.append(f"- [{e.get('type','event')}] {e.get('task','?')} | actor={e.get('actor','?')} | risk={e.get('risk','?')} | strategy={e.get('strategy','?')} | result={e.get('result','?')}")
    lines.append('')
else:
    lines.append('### Audit Events (last 24h)')
    lines.append('- no events recorded')
    lines.append('')

block='\n'.join(lines).strip()+"\n\n"

if changelog.exists():
    current=changelog.read_text(encoding='utf-8')
else:
    current='# OPERATIONS_CHANGELOG\n\n'

# evita duplicar dia
marker=f"## {now.strftime('%Y-%m-%d')} (UTC)"
if marker in current:
    # replace section simples: remove old section for same day
    parts=current.split(marker)
    head=parts[0]
    tail=''
    if len(parts)>1:
        rest=parts[1]
        idx=rest.find('\n## ')
        if idx!=-1:
            tail=rest[idx+1:]
    new_content=head+block+(tail if tail else '')
else:
    new_content=current+block

changelog.write_text(new_content, encoding='utf-8')
print('[auto-doc-ops] updated changelog')
PY
