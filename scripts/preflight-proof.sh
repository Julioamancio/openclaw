#!/bin/bash
set -euo pipefail

INV="/root/.openclaw/workspace/safety-invariants.json"
PAYLOAD="${1:-}"

if [ -z "$PAYLOAD" ]; then
  echo "Uso: preflight-proof.sh '<json_payload>'"
  exit 1
fi

python3 - "$INV" "$PAYLOAD" <<'PY'
import json,sys
inv_path,payload_raw=sys.argv[1:3]
inv=json.load(open(inv_path))
p=json.loads(payload_raw)

risk=str(p.get('missionRisk','medium')).lower()
steps=p.get('steps',[]) if isinstance(p.get('steps',[]),list) else []
has_snapshot=bool(p.get('hasSnapshot',False))
window_allowed=bool(p.get('windowAllowed',False))

high_steps=[s for s in steps if str(s.get('risk','')).lower()=='high']
high_have_rb=all(bool(str(s.get('rollbackEntrypoint','')).strip()) for s in high_steps)

ctx={
  'hasSnapshot': has_snapshot,
  'windowAllowed': window_allowed,
  'highRiskStepsHaveRollback': high_have_rb
}

failed=[]
passed=[]
for r in inv.get('invariants',[]):
  cond=r.get('when',{})
  risks=cond.get('missionRiskIn',[])
  if risks and risk not in risks:
    continue
  chk=r.get('check')
  ok=bool(ctx.get(chk,False))
  item={'id':r.get('id'),'ok':ok,'reason':r.get('reason','')}
  if ok: passed.append(item)
  else: failed.append(item)

out={
  'ok': len(failed)==0,
  'missionRisk': risk,
  'checked': len(passed)+len(failed),
  'passed': passed,
  'failed': failed,
  'context': {
    'hasSnapshot': has_snapshot,
    'windowAllowed': window_allowed,
    'highRiskSteps': len(high_steps)
  }
}
print(json.dumps(out, ensure_ascii=False))
if failed:
  raise SystemExit(2)
PY
