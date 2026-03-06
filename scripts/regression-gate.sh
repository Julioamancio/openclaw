#!/bin/bash
set -euo pipefail

GATE_CFG="/root/.openclaw/workspace/eval/regression-gate.json"
REPORT="/root/.openclaw/workspace/eval/regression-report.json"

if [ ! -f "$REPORT" ]; then
  echo '{"gate":"fail","reason":"missing_regression_report"}'
  exit 2
fi

python3 - "$GATE_CFG" "$REPORT" <<'PY'
import json,sys
cfg=json.load(open(sys.argv[1]))
rep=json.load(open(sys.argv[2]))
pol=cfg.get('policy',{})
min_score=int(pol.get('minScore',90))
block_any=bool(pol.get('blockIfAnyFailed',True))
score=int(rep.get('score',0))
results=rep.get('results',[])
failed=[r for r in results if not r.get('ok')]

ok=True
reasons=[]
if score < min_score:
  ok=False; reasons.append(f'score_below_min:{score}<{min_score}')
if block_any and failed:
  ok=False; reasons.append(f'failed_cases:{len(failed)}')

out={'gate':'pass' if ok else 'fail','score':score,'failedCases':len(failed),'reasons':reasons}
print(json.dumps(out, ensure_ascii=False))
if not ok: raise SystemExit(2)
PY
