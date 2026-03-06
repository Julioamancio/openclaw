#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
SCENARIOS="$WORKSPACE/eval/scenarios.json"
OUT_JSON="$WORKSPACE/eval/latest-report.json"
OUT_MD="$WORKSPACE/eval/latest-report.md"

python3 - "$SCENARIOS" "$OUT_JSON" "$OUT_MD" <<'PY'
import json, subprocess, sys, tempfile, shutil
from datetime import datetime, timezone
from pathlib import Path

sc_path, out_json, out_md = sys.argv[1:4]
sc = json.loads(Path(sc_path).read_text())
results=[]
passed=0
workspace=Path('/root/.openclaw/workspace')


def run(cmd):
    return subprocess.run(cmd, shell=True, text=True, capture_output=True)

for s in sc.get('scenarios',[]):
    sid=s['id']; typ=s['type']; exp=s['expect']; ok=True; notes=[]

    if typ in ('router','router_degraded'):
        inp=s['input']
        metrics_path=workspace/'router-metrics.json'
        backup_path=workspace/'router-metrics.eval.bak'
        if typ=='router_degraded':
            # backup + inject degradation
            if metrics_path.exists():
                shutil.copy2(metrics_path, backup_path)
            try:
                m=json.loads(metrics_path.read_text()) if metrics_path.exists() else {"version":1,"models":{}}
                dm=s.get('degradedModel','')
                mm=m.setdefault('models',{}).setdefault(dm,{})
                mm['attempts']=10; mm['failed']=6; mm['success']=4; mm['failStreak']=3
                metrics_path.write_text(json.dumps(m, ensure_ascii=False, indent=2))
            except Exception as e:
                ok=False; notes.append(f'degrade inject failed: {e}')

        r=run(f"/root/.openclaw/workspace/scripts/model-route.sh \"{inp}\"")
        out=r.stdout
        vals={}
        for ln in out.splitlines():
            if '=' in ln:
                k,v=ln.split('=',1); vals[k]=v
        route=vals.get('ROUTE_NAME','')
        model=vals.get('ROUTE_MODEL','')
        if exp.get('routeNameContains','') not in route:
            ok=False; notes.append(f"route mismatch: {route}")
        if model not in exp.get('modelIn',[]):
            ok=False; notes.append(f"model mismatch: {model}")
        if 'riskRequireConfirmation' in exp:
            rr=run(f"/root/.openclaw/workspace/scripts/risk-score.sh \"{inp}\"")
            rvals={}
            for ln in rr.stdout.splitlines():
                if '=' in ln:
                    k,v=ln.split('=',1); rvals[k]=v
            if int(rvals.get('RISK_REQUIRE_CONFIRMATION','0')) != int(exp['riskRequireConfirmation']):
                ok=False; notes.append("risk confirmation mismatch")

        if typ=='router_degraded':
            # restore metrics
            if backup_path.exists():
                shutil.move(str(backup_path), str(metrics_path))
            else:
                # if no original backup, reset minimal
                metrics_path.write_text(json.dumps({"version":1,"models":{}}, indent=2))

    elif typ=='http':
        if 'health-score' in s['input']:
            r=run("curl -sS -w '\nHTTP_STATUS:%{http_code}' http://127.0.0.1:8899/mc/health-score")
        else:
            r=run("curl -sS -w '\nHTTP_STATUS:%{http_code}' http://127.0.0.1:8899/mc/runbooks")
        body=r.stdout
        status=0
        if 'HTTP_STATUS:' in body:
            body, st = body.rsplit('HTTP_STATUS:',1)
            status=int(st.strip() or 0)
        if status != int(exp.get('status',200)):
            ok=False; notes.append(f"status {status}")
        try:
            js=json.loads(body)
            for k in exp.get('jsonKeys',[]):
                if k not in js:
                    ok=False; notes.append(f"missing key {k}")
        except Exception:
            ok=False; notes.append('invalid json')

    elif typ=='shell':
        if s['input']=='dispatch_lock':
            cmd=(
                "cd /root/.openclaw/workspace && "
                "./scripts/dispatch-mc-alerts.sh >/tmp/eval-disp-a.log 2>&1 & "
                "sleep 0.2; ./scripts/dispatch-mc-alerts.sh >/tmp/eval-disp-b.log 2>&1 || true; "
                "wait || true; tail -n 5 /tmp/eval-disp-b.log"
            )
            r=run(cmd)
            out=(r.stdout or '') + (r.stderr or '')
            if exp.get('contains','') not in out:
                ok=False; notes.append('lock evidence missing')
        elif s['input']=='policy_block_high_risk':
            r=run("/root/.openclaw/workspace/scripts/policy-check.sh auto_heal high 0 1 1")
            out=(r.stdout or '') + (r.stderr or '')
            if exp.get('contains','') not in out:
                ok=False; notes.append('policy block missing')
        else:
            ok=False; notes.append('unknown shell input')

    else:
        ok=False; notes.append('unknown type')

    if ok: passed += 1
    results.append({"id":sid,"ok":ok,"notes":"; ".join(notes)})

score=round((passed/len(results))*100) if results else 0
report={
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "total": len(results),
    "passed": passed,
    "score": score,
    "results": results,
    "gate": "pass" if score>=85 else "fail"
}
Path(out_json).write_text(json.dumps(report, ensure_ascii=False, indent=2))

md=[f"# Eval Report\n",f"- generatedAt: {report['generatedAt']}",f"- total: {report['total']}",f"- passed: {report['passed']}",f"- score: {report['score']}",f"- gate: **{report['gate']}**\n", "## Cases"]
for r in results:
    md.append(f"- {'✅' if r['ok'] else '❌'} {r['id']} {('— '+r['notes']) if r['notes'] else ''}")
Path(out_md).write_text("\n".join(md)+"\n")
print(json.dumps(report, ensure_ascii=False))
PY
