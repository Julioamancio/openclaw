#!/bin/bash
set -euo pipefail

MISSION="${1:-}"
RISK="${2:-medium}"
BUDGET="${3:-0.8}"

if [ -z "$MISSION" ]; then
  echo "Uso: planner-arbiter.sh \"mission\" [risk] [budget]"
  exit 1
fi

RAW=$(/root/.openclaw/workspace/scripts/planner-competitive.sh "$MISSION" "$RISK" "$BUDGET")

python3 - "$RAW" <<'PY'
import json,sys
x=json.loads(sys.argv[1])

# deterministic arbiter weighting
cands=x.get('candidates',[])
for c in cands:
  step=(c.get('plan') or [{}])[0]
  score=float(c.get('score',0))
  if step.get('risk')=='high':
    score += 10
  if step.get('capabilityId')=='incident-recovery.v3':
    score += 8
  if c.get('planner')=='cost':
    score -= 5
  c['arbiterScore']=round(score,2)

winner=sorted(cands, key=lambda z:z.get('arbiterScore',0), reverse=True)[0] if cands else {'planner':'none','plan':[],'arbiterScore':0}
out={
  'mission':x.get('mission'),
  'risk':x.get('risk'),
  'budgetUsd':x.get('budgetUsd'),
  'winner':winner,
  'candidates':cands
}
print(json.dumps(out, ensure_ascii=False))
PY
