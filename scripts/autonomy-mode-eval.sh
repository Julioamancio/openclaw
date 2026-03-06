#!/bin/bash
set -euo pipefail

POLICY="/root/.openclaw/workspace/autonomy-policy.json"
RUNS="/root/.openclaw/workspace/mission-runs.json"

python3 - "$POLICY" "$RUNS" <<'PY'
import json,sys
policy=json.load(open(sys.argv[1]))
runs=json.load(open(sys.argv[2])).get('runs',[])
recent=runs[:50] if isinstance(runs,list) else []

if not recent:
  print(json.dumps({'mode': policy.get('defaultMode','observe'), 'reason':'no_recent_runs', 'stats':{'successRate':0,'failureRate':0,'avgCostUsd':0}}, ensure_ascii=False))
  raise SystemExit

done=sum(1 for r in recent if str(r.get('status'))=='done')
failed=sum(1 for r in recent if str(r.get('status'))=='failed')
total=len(recent)
success=round((done/total)*100,2)
failure=round((failed/total)*100,2)
costs=[float((r.get('finops') or {}).get('estimatedCostUsd',0) or 0) for r in recent]
avg=round(sum(costs)/len(costs),5) if costs else 0

thr=policy.get('thresholds',{})
a=thr.get('autopilot',{})
asst=thr.get('assist',{})
mode='observe'; reason='below_assist_threshold'

if success >= float(asst.get('minSuccessRate',92)) and failure <= float(asst.get('maxFailureRate',8)) and avg <= float(asst.get('maxAvgCostUsd',0.05)):
  mode='assist'; reason='assist_threshold_met'
if success >= float(a.get('minSuccessRate',98)) and failure <= float(a.get('maxFailureRate',2)) and avg <= float(a.get('maxAvgCostUsd',0.02)):
  mode='autopilot'; reason='autopilot_threshold_met'

print(json.dumps({'mode':mode,'reason':reason,'stats':{'successRate':success,'failureRate':failure,'avgCostUsd':avg,'sample':total}}, ensure_ascii=False))
PY
