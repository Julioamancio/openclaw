#!/bin/bash
set -euo pipefail

POLICY="/root/.openclaw/workspace/policy-formal.json"
INPUT="${1:-}"

if [ -z "$INPUT" ]; then
  echo "Uso: policy-formal-eval.sh '{"\"risk\"":"\"high\"","\"approved\"":false,"\"hasSnapshot\"":true}'"
  exit 1
fi

python3 - "$POLICY" "$INPUT" <<'PY'
import json,sys
policy_path,input_raw=sys.argv[1:3]
policy=json.load(open(policy_path))
ctx=json.loads(input_raw)

def matches(rule,ctx):
  w=rule.get('when',{})
  for k,v in w.items():
    cv=ctx.get(k)
    if isinstance(v,list):
      if cv not in v: return False
    else:
      if cv != v: return False
  return True

for r in policy.get('rules',[]):
  if matches(r,ctx):
    print(json.dumps({'allow': r.get('effect')!='deny', 'rule': r.get('id'), 'reason': r.get('reason','')}, ensure_ascii=False))
    raise SystemExit(0 if r.get('effect')!='deny' else 2)

d=policy.get('default',{'effect':'allow','reason':'default'})
print(json.dumps({'allow': d.get('effect')!='deny', 'rule':'default', 'reason': d.get('reason','')}, ensure_ascii=False))
raise SystemExit(0 if d.get('effect')!='deny' else 2)
PY
