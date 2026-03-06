#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
PAYLOAD="${1:-}"
TIMEOUT_SEC="${2:-240}"

if [ -z "$PAYLOAD" ]; then
  echo "Uso: mission-dsl-exec.sh '<payload_json>' [timeout_sec]"
  exit 1
fi

python3 - "$WORKSPACE" "$PAYLOAD" "$TIMEOUT_SEC" <<'PY'
import json,subprocess,sys,time
from datetime import datetime, timezone

ws,payload_raw,timeout_sec = sys.argv[1], sys.argv[2], int(sys.argv[3])
p = json.loads(payload_raw)
steps = p.get('steps',[])
run={'id':f"dsl_{int(time.time())}",'startedAt':datetime.now(timezone.utc).isoformat(),'status':'running','steps':[],'rollback':[]}
completed=[]

for s in steps:
    cap=s.get('capabilityId')
    entry=s.get('entrypoint','').strip()
    rb=s.get('rollbackEntrypoint','').strip()
    t0=time.time()
    ok=False; note=''
    if not entry:
      ok=False; note='missing entrypoint'
    else:
      proc=subprocess.run(['/bin/sh','-lc',f'cd {ws} && {entry}'],capture_output=True,text=True,timeout=timeout_sec)
      ok=(proc.returncode==0)
      note=(proc.stdout or proc.stderr or '').strip()[:400]
    dur=round(time.time()-t0,2)
    run['steps'].append({'capabilityId':cap,'ok':ok,'durationSec':dur,'note':note})
    if not ok:
      run['status']='failed'
      for c in reversed(completed):
        if not c.get('rollbackEntrypoint'):
          run['rollback'].append({'capabilityId':c.get('capabilityId'),'attempted':False,'ok':False,'note':'no rollback'})
          continue
        r=subprocess.run(['/bin/sh','-lc',f"cd {ws} && {c['rollbackEntrypoint']}"],capture_output=True,text=True,timeout=timeout_sec)
        run['rollback'].append({'capabilityId':c.get('capabilityId'),'attempted':True,'ok':r.returncode==0,'note':(r.stdout or r.stderr or '').strip()[:300]})
      break
    completed.append({'capabilityId':cap,'rollbackEntrypoint':rb})

if run['status']=='running': run['status']='done'
run['endedAt']=datetime.now(timezone.utc).isoformat()
print(json.dumps(run, ensure_ascii=False))
PY
