#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
TARGET_CHAT="${MC_ALERT_TARGET:-720093594}"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
LOCK_FILE="/tmp/daily-exec-summary.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[daily-exec-summary] lock ativo, execução concorrente ignorada"
  exit 0
fi

python3 - <<'PY' > /tmp/mc-exec-summary.txt
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

jobs_path=Path('/root/.openclaw/workspace/mc-jobs.json')
pm_path=Path('/root/.openclaw/workspace/mc-postmortems.json')

jobs=json.loads(jobs_path.read_text()) if jobs_path.exists() else {'jobs':[],'runs':[]}
pms=json.loads(pm_path.read_text()) if pm_path.exists() else []

now=datetime.now(timezone.utc)
last24=now-timedelta(hours=24)

def parse_ts(v):
    try:
        return datetime.fromisoformat(str(v).replace('Z','+00:00'))
    except Exception:
        return None

runs=jobs.get('runs',[])
recent=[r for r in runs if (parse_ts(r.get('ts')) and parse_ts(r.get('ts'))>=last24)]
ok=sum(1 for r in recent if str(r.get('status','')).lower()=='done')
failed=sum(1 for r in recent if str(r.get('status','')).lower()=='failed')
running=sum(1 for r in recent if str(r.get('status','')).lower()=='running')

success_rate = (ok/len(recent)*100) if recent else 100.0
open_pm=[p for p in pms if str(p.get('status','')).lower()=='open']
closed_pm=[p for p in pms if str(p.get('status','')).lower()=='closed']

job_lines=[f"• {j.get('task','?')}: {j.get('status','?')} (último: {j.get('lastRun','--')})" for j in jobs.get('jobs',[])]

health='🟢 estável'
if failed>=3 or success_rate<90:
    health='🔴 crítico'
elif failed>=1 or success_rate<97:
    health='🟡 atenção'

print('📊 *Resumo Executivo Diário — Mission Control*')
print('')
print(f'• Saúde geral: {health}')
print(f'• Runs (24h): {len(recent)} | ✅ {ok} | ❌ {failed} | 🟠 {running}')
print(f'• Success rate (24h): {success_rate:.1f}%')
print(f'• Postmortems: open={len(open_pm)} | closed={len(closed_pm)}')
print('')
print('*Estado dos Jobs*')
print('\n'.join(job_lines[:10]) if job_lines else '• sem jobs registrados')
if open_pm:
    print('\n*Riscos abertos*')
    for p in open_pm[:5]:
        print(f"• {p.get('incident','(sem incidente)')}")
PY

if command -v openclaw >/dev/null 2>&1; then
  MSG=$(cat /tmp/mc-exec-summary.txt)
  openclaw message send --channel "$CHANNEL" --to "$TARGET_CHAT" --message "$MSG" >/dev/null 2>&1 || true
fi

echo "[daily-exec-summary] sent"
