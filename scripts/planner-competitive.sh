#!/bin/bash
set -euo pipefail

MISSION="${1:-}"
RISK="${2:-medium}"
BUDGET="${3:-0.8}"

if [ -z "$MISSION" ]; then
  echo "Uso: planner-competitive.sh \"mission\" [risk] [budget]"
  exit 1
fi

python3 - "$MISSION" "$RISK" "$BUDGET" <<'PY'
import json,sys,re
mission,risk,budget = sys.argv[1],sys.argv[2],float(sys.argv[3])

candidates=[]
# planner A - safety biased
candidates.append({
  'planner':'safety',
  'plan':[{'capabilityId':'incident-recovery.v3' if re.search(r'incident|falha|outage', mission, re.I) else 'ops-summary.v1','intent':'safe-first','risk':risk,'slaMinutes':30}],
  'score':0
})
# planner B - cost biased
candidates.append({
  'planner':'cost',
  'plan':[{'capabilityId':'ops-summary.v1','intent':'cost-first','risk':'low','slaMinutes':120}],
  'score':0
})
# planner C - balanced
candidates.append({
  'planner':'balanced',
  'plan':[{'capabilityId':'email-monitor.v2' if re.search(r'email|inbox|remetente', mission, re.I) else 'ops-summary.v1','intent':'balanced','risk':risk,'slaMinutes':60}],
  'score':0
})

for c in candidates:
  step=c['plan'][0]
  s=100
  if step['risk']=='high': s -= 20
  if c['planner']=='cost' and budget < 0.05: s += 10
  if c['planner']=='safety' and risk=='high': s += 15
  if c['planner']=='balanced': s += 5
  c['score']=s

winner=sorted(candidates,key=lambda x:x['score'], reverse=True)[0]
print(json.dumps({'mission':mission,'risk':risk,'budgetUsd':budget,'winner':winner,'candidates':candidates}, ensure_ascii=False))
PY
