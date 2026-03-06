#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
PLAN_JSON="${1:-}"

if [ -z "$PLAN_JSON" ]; then
  echo "Uso: mission-verifier.sh '<plan_json>'"
  exit 1
fi

VAL=$($WORKSPACE/scripts/contracts-validate.sh "$PLAN_JSON" 2>/dev/null || true)

python3 - "$PLAN_JSON" "$VAL" <<'PY'
import json,sys
plan=json.loads(sys.argv[1])
val=json.loads(sys.argv[2]) if sys.argv[2].strip() else {'ok':False,'errors':['validator failed']}

risk=str(plan.get('missionRisk','medium')).lower()
steps=plan.get('steps',[])

errors=list(val.get('errors',[]))
warnings=[]

if risk=='high':
    has_high=any(str(s.get('risk','')).lower()=='high' for s in steps)
    if not has_high:
        warnings.append('missionRisk=high but no high-risk step declared')

for i,s in enumerate(steps):
    if str(s.get('risk','')).lower()=='high' and not s.get('rollbackEntrypoint'):
        warnings.append(f'step[{i}] high risk without rollbackEntrypoint')

ok = bool(val.get('ok')) and len(errors)==0
print(json.dumps({'ok':ok,'errors':errors,'warnings':warnings,'checkedSteps':len(steps)}, ensure_ascii=False))
if not ok:
    raise SystemExit(2)
PY
