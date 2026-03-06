#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
MAP_FILE="$WORKSPACE/oncall-map.json"
PM_FILE="$WORKSPACE/mc-postmortems.json"
STAMP_FILE="/tmp/mc-l3-escalation-stamps.json"

python3 - <<'PY'
import json, re, subprocess
from datetime import datetime, timezone
from pathlib import Path

map_file=Path('/root/.openclaw/workspace/oncall-map.json')
pm_file=Path('/root/.openclaw/workspace/mc-postmortems.json')
stamp_file=Path('/tmp/mc-l3-escalation-stamps.json')

if not map_file.exists() or not pm_file.exists():
    raise SystemExit(0)

cfg=json.loads(map_file.read_text())
pms=json.loads(pm_file.read_text())
stamps=json.loads(stamp_file.read_text()) if stamp_file.exists() else {}

def route_for(incident:str):
    for r in cfg.get('routes',[]):
      if re.search(r.get('match',''), incident or '', re.I):
        return r
    return cfg.get('default',{})

now=datetime.now(timezone.utc)
changed=False

for p in pms:
    if p.get('status')!='open':
        continue
    incident=str(p.get('incident',''))
    created=p.get('created_at')
    if not created:
        continue
    try:
        dt=datetime.fromisoformat(created.replace('Z','+00:00'))
    except Exception:
        continue
    route=route_for(incident)
    sla=int(route.get('slaMinutes',15))
    age_min=int((now-dt).total_seconds()//60)
    if age_min < sla:
        continue

    key=p.get('id') or incident
    last=stamps.get(key)
    # repinga a cada SLA minutos
    if last:
        try:
            last_dt=datetime.fromisoformat(last)
            if (now-last_dt).total_seconds() < sla*60:
                continue
        except Exception:
            pass

    msg=(
      "🔴 *SLA BREACH (L3)*\n"
      f"• incidente: {incident}\n"
      f"• owner: {route.get('owner','OnCall')}\n"
      f"• aberto há: {age_min} min\n"
      f"• SLA: {sla} min\n"
      "• ação: intervenção manual necessária"
    )

    channel=route.get('channel','telegram')
    target=str(route.get('target','720093594'))
    subprocess.run([
      'openclaw','message','send','--channel',channel,'--to',target,'--message',msg
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    stamps[key]=now.isoformat()
    changed=True

if changed:
    stamp_file.write_text(json.dumps(stamps, ensure_ascii=False, indent=2))
PY

echo "[l3-escalation] checked"
