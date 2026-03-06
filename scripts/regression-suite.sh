#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
SCEN="$WORKSPACE/eval/regression-missions.json"

python3 - "$SCEN" <<'PY'
import json,subprocess,sys
from datetime import datetime, timezone
sc=json.load(open(sys.argv[1]))
results=[]; passed=0
for m in sc.get('missions',[]):
  inp=m.get('input',{})
  proc=subprocess.run([
    'curl','-sS','-X','POST','http://127.0.0.1:8899/mc/mission-execute',
    '-H','Content-Type: application/json',
    '-d',json.dumps(inp)
  ], capture_output=True, text=True)
  ok=False; notes=[]
  try:
    out=json.loads(proc.stdout)
    exp=m.get('expect',{})
    ok=True
    if exp.get('status') and out.get('status')!=exp.get('status'):
      ok=False; notes.append(f"status={out.get('status')}")
    if exp.get('missionRisk') and out.get('missionRisk')!=exp.get('missionRisk'):
      ok=False; notes.append(f"missionRisk={out.get('missionRisk')}")
    if exp.get('finopsActionIn') and out.get('finops',{}).get('action') not in exp.get('finopsActionIn'):
      ok=False; notes.append(f"finops.action={out.get('finops',{}).get('action')}")
  except Exception as e:
    notes.append(f'invalid_response:{e}')
  if ok: passed+=1
  results.append({'id':m.get('id'),'ok':ok,'notes':'; '.join(notes)})

score=round((passed/len(results))*100) if results else 0
report={'generatedAt':datetime.now(timezone.utc).isoformat(),'total':len(results),'passed':passed,'score':score,'gate':'pass' if score>=90 else 'fail','results':results}
open('/root/.openclaw/workspace/eval/regression-report.json','w').write(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
if report['gate']!='pass': raise SystemExit(2)
PY
