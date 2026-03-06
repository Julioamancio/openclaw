#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
RUNS="$WORKSPACE/mission-runs.json"

python3 - "$RUNS" <<'PY'
import json,sys
runs=json.load(open(sys.argv[1])).get('runs',[])
if not isinstance(runs,list): runs=[]

by_model={}
for r in runs[:200]:
    f=r.get('finops',{}) if isinstance(r,dict) else {}
    m=f.get('model') or 'unknown'
    item=by_model.setdefault(m,{'missions':0,'done':0,'failed':0,'slaBreaches':0,'estCost':0.0})
    item['missions']+=1
    st=str(r.get('status',''))
    if st=='done': item['done']+=1
    if st=='failed': item['failed']+=1
    sla=r.get('sla',{})
    item['slaBreaches']+=int(sla.get('breaches',0) or 0)
    item['estCost']+=float(f.get('estimatedCostUsd',0) or 0)

rows=[]
for m,v in by_model.items():
    succ=(v['done']/v['missions']*100) if v['missions'] else 0
    avg=(v['estCost']/v['missions']) if v['missions'] else 0
    score= round((succ*0.6) + (max(0,100-v['slaBreaches']*5)*0.2) + (max(0,100-min(100,avg*10000))*0.2),2)
    rows.append({'model':m,**v,'successRatePct':round(succ,1),'avgCostUsd':round(avg,5),'shadowScore':score})
rows.sort(key=lambda x: x['shadowScore'], reverse=True)
print(json.dumps({'totalModels':len(rows),'ranking':rows}, ensure_ascii=False))
PY
