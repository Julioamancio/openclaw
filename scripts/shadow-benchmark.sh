#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
OUT="$WORKSPACE/eval/shadow-benchmark.json"

python3 - "$WORKSPACE/model-router.json" "$WORKSPACE/router-metrics.json" "$OUT" <<'PY'
import json, sys
from datetime import datetime, timezone
router_path, metrics_path, out_path = sys.argv[1:4]

router=json.load(open(router_path)) if __import__('pathlib').Path(router_path).exists() else {}
metrics=json.load(open(metrics_path)) if __import__('pathlib').Path(metrics_path).exists() else {"models":{}}

models=set()
models.add(router.get('default',''))
models.add(router.get('fallback',''))
for r in router.get('routes',[]):
    if r.get('model'): models.add(r['model'])
models={m for m in models if m}

rows=[]
for m in sorted(models):
    mm=(metrics.get('models') or {}).get(m,{})
    attempts=int(mm.get('attempts',0) or 0)
    success=int(mm.get('success',0) or 0)
    failed=int(mm.get('failed',0) or 0)
    lat=float(mm.get('avgLatencyMs',0) or 0)
    sr=(success/attempts*100) if attempts>0 else 0.0
    # composite score (higher better)
    score=(sr*0.7) + ((max(0, 1000-lat)/10.0)*0.3)
    rows.append({
      'model': m,
      'attempts': attempts,
      'success_rate_pct': round(sr,2),
      'avg_latency_ms': round(lat,2),
      'composite_score': round(score,2)
    })

rows.sort(key=lambda x: x['composite_score'], reverse=True)
report={
  'generatedAt': datetime.now(timezone.utc).isoformat(),
  'models': rows,
  'winner': rows[0]['model'] if rows else None
}
json.dump(report, open(out_path,'w'), ensure_ascii=False, indent=2)
print(json.dumps(report, ensure_ascii=False))
PY
