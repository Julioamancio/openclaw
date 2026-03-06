#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
CAPS="$WORKSPACE/capabilities.json"
MISSION="${*:-}"

if [ -z "$MISSION" ]; then
  echo "Uso: mission-api.sh \"objetivo\""
  exit 1
fi

python3 - "$CAPS" "$MISSION" <<'PY'
import json, re, sys
from datetime import datetime, timezone

caps_path, mission = sys.argv[1:3]
try:
    data=json.load(open(caps_path))
    caps=data.get('capabilities',[])
except Exception:
    caps=[]

rules=[
  (r'email|remetente|inbox|imap', 'email-monitor.v2', 'Monitorar e reportar novos e-mails relevantes'),
  (r'incident|falha|alerta|outage|recover|recovery', 'incident-recovery.v3', 'Diagnosticar e recuperar incidente com política e state machine'),
  (r'ideia|negócio|saas|business', 'business-idea.v1', 'Gerar ideia validada com stack e monetização'),
  (r'resumo|executivo|ops|status', 'ops-summary.v1', 'Gerar resumo executivo operacional')
]

selected=[]
for pat, cid, intent in rules:
    if re.search(pat, mission, re.I):
        selected.append((cid,intent))

if not selected:
    selected=[('ops-summary.v1','Interpretar objetivo e iniciar plano operacional padrão')]

cap_map={c.get('id'):c for c in caps}
plan=[]
for cid,intent in selected:
    c=cap_map.get(cid,{})
    plan.append({
      'capabilityId': cid,
      'intent': intent,
      'owner': c.get('owner','Mike'),
      'risk': c.get('risk','medium'),
      'slaMinutes': c.get('slaMinutes',60),
      'entrypoint': c.get('entrypoint','')
    })

# mission level risk
risk='low'
if any(p['risk']=='high' for p in plan):
    risk='high'
elif any(p['risk']=='medium' for p in plan):
    risk='medium'

out={
  'generatedAt': datetime.now(timezone.utc).isoformat(),
  'mission': mission,
  'missionRisk': risk,
  'plan': plan,
  'nextAction': plan[0]['entrypoint'] if plan else None
}
print(json.dumps(out, ensure_ascii=False, indent=2))
PY
