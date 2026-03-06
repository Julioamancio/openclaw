#!/bin/bash
set -euo pipefail

PAYLOAD="${1:-}"
if [ -z "$PAYLOAD" ]; then
  echo "Uso: ensemble-judge.sh '<json_payload>'"
  exit 1
fi

python3 - "$PAYLOAD" <<'PY'
import json,sys
p=json.loads(sys.argv[1])
cands=p.get('candidates',[])
if not isinstance(cands,list) or not cands:
  print(json.dumps({'ok':False,'error':'candidates required'}))
  raise SystemExit(2)

scored=[]
for i,c in enumerate(cands):
  step=(c.get('plan') or [{}])[0]
  base=float(c.get('arbiterScore', c.get('score', 50)))
  risk=str(step.get('risk','medium')).lower()
  cap=str(step.get('capabilityId',''))
  s=base
  if risk=='high': s += 12
  if cap=='incident-recovery.v3': s += 8
  if cap=='ops-summary.v1' and risk=='high': s -= 10
  scored.append({
    'idx': i,
    'planner': c.get('planner','unknown'),
    'score': round(s,2),
    'plan': c.get('plan',[])
  })

winner=sorted(scored,key=lambda x:x['score'], reverse=True)[0]
print(json.dumps({'ok':True,'winner':winner,'scored':scored}, ensure_ascii=False))
PY
