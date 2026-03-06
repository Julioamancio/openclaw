#!/bin/bash
set -euo pipefail

CONTRACTS="/root/.openclaw/workspace/capability-contracts.json"
PAYLOAD="${1:-}"

if [ -z "$PAYLOAD" ]; then
  echo "Uso: contracts-validate.sh '<json_payload>'"
  exit 1
fi

python3 - "$CONTRACTS" "$PAYLOAD" <<'PY'
import json,sys
contracts_path,payload_raw=sys.argv[1:3]
contracts=json.load(open(contracts_path))
payload=json.loads(payload_raw)

errors=[]
steps=payload.get('steps',[])
if not isinstance(steps,list) or not steps:
    errors.append('steps must be non-empty array')

req=contracts.get('dsl',{}).get('requiredStepFields',['capabilityId','intent'])
allowed=set(req + contracts.get('dsl',{}).get('optionalStepFields',[]))
capdefs=contracts.get('capabilities',{})

for i,s in enumerate(steps):
    if not isinstance(s,dict):
        errors.append(f'step[{i}] must be object'); continue
    for f in req:
        if not s.get(f): errors.append(f'step[{i}] missing {f}')
    cap=s.get('capabilityId')
    if cap and cap not in capdefs:
        errors.append(f'step[{i}] unknown capabilityId={cap}')
    extra=[k for k in s.keys() if k not in allowed]
    if extra:
        errors.append(f'step[{i}] extra fields: {extra}')

ok=not errors
print(json.dumps({'ok':ok,'errors':errors,'totalSteps':len(steps)}, ensure_ascii=False))
if not ok:
    raise SystemExit(2)
PY
