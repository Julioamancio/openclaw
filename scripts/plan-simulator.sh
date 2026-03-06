#!/bin/bash
set -euo pipefail

PAYLOAD="${1:-}"
if [ -z "$PAYLOAD" ]; then
  echo "Uso: plan-simulator.sh '<json_payload>'"
  exit 1
fi

python3 - "$PAYLOAD" <<'PY'
import json,sys
p=json.loads(sys.argv[1])
cands=p.get('candidates',[])
if not isinstance(cands,list) or not cands:
  # allow single plan
  steps=p.get('steps',[])
  cands=[{'planner':'single','plan':steps}]

rows=[]
for c in cands:
  plan=c.get('plan',[])
  mttr=0
  risk_residual=0
  cost=0.0
  for s in plan:
    r=str(s.get('risk','medium')).lower()
    sla=float(s.get('slaMinutes',60) or 60)
    mttr += sla
    if r=='high': risk_residual += 30; cost += 0.006
    elif r=='medium': risk_residual += 12; cost += 0.003
    else: risk_residual += 5; cost += 0.0015
    if not str(s.get('rollbackEntrypoint','')).strip() and r=='high':
      risk_residual += 18
  expected_success=max(10, 100 - risk_residual*0.8)
  value = round(expected_success - (mttr*0.08) - (cost*1000*0.3), 2)
  rows.append({
    'planner': c.get('planner','unknown'),
    'plan': plan,
    'expected': {
      'mttrMinutes': round(mttr,2),
      'riskResidual': round(risk_residual,2),
      'costUsd': round(cost,5),
      'successPct': round(expected_success,2),
      'valueScore': value
    }
  })

rows.sort(key=lambda x:x['expected']['valueScore'], reverse=True)
print(json.dumps({'ok':True,'winner':rows[0],'alternatives':rows}, ensure_ascii=False))
PY
