#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"

python3 - <<'PY'
import json,subprocess
cases=[
  ({'risk':'high','approved':False,'hasSnapshot':True}, False, 'deny_high_risk_without_approval'),
  ({'risk':'medium','approved':True,'hasSnapshot':False}, False, 'deny_missing_snapshot'),
  ({'risk':'low','approved':False,'hasSnapshot':True}, True, 'default')
]
passed=0
rows=[]
for i,(inp,expect_allow,expect_rule) in enumerate(cases, start=1):
  p=subprocess.run(['/root/.openclaw/workspace/scripts/policy-formal-eval.sh', json.dumps(inp)],capture_output=True,text=True)
  out=(p.stdout or p.stderr).strip().splitlines()[-1]
  r=json.loads(out)
  ok=(bool(r.get('allow'))==expect_allow and str(r.get('rule'))==expect_rule)
  if ok: passed+=1
  rows.append({'id':f'pf_{i}','ok':ok,'got':r,'input':inp})
score=round((passed/len(rows))*100)
report={'total':len(rows),'passed':passed,'score':score,'gate':'pass' if score==100 else 'fail','results':rows}
print(json.dumps(report, ensure_ascii=False))
if score<100: raise SystemExit(2)
PY
