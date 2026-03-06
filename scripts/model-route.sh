#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
ROUTER_FILE="$WORKSPACE/model-router.json"
METRICS_FILE="$WORKSPACE/router-metrics.json"
TEXT="${*:-}"

python3 - "$ROUTER_FILE" "$METRICS_FILE" "$TEXT" <<'PY'
import json, re, sys
router_path, metrics_path, text = sys.argv[1:4]

def out(model, route, reason):
    print(f"ROUTE_MODEL={model}")
    print(f"ROUTE_NAME={route}")
    print(f"ROUTE_REASON={reason}")

try:
    cfg=json.load(open(router_path))
except Exception:
    out('openai-codex/gpt-5.3-codex','fallback-no-config','router config missing')
    raise SystemExit

metrics={"models":{}}
try:
    metrics=json.load(open(metrics_path))
except Exception:
    pass

fallback=cfg.get('fallback', cfg.get('default','openai-codex/gpt-5.3-codex'))

def is_degraded(model):
    m=(metrics.get('models') or {}).get(model) or {}
    attempts=int(m.get('attempts',0) or 0)
    failed=int(m.get('failed',0) or 0)
    fail_streak=int(m.get('failStreak',0) or 0)
    failure_rate=(failed/attempts) if attempts>0 else 0
    return fail_streak>=3 or (attempts>=6 and failure_rate>=0.5)

selected=None
route_name='default'
reason='no specific route matched'
for r in cfg.get('routes',[]):
    if re.search(r.get('match',''), text, re.I):
        selected=r.get('model', cfg.get('default',fallback))
        route_name=r.get('name','route')
        reason=r.get('reason','matched')
        break
if not selected:
    selected=cfg.get('default',fallback)

if is_degraded(selected):
    out(fallback, route_name + '_fallback', reason + f' | provider_degraded:{selected}')
else:
    out(selected, route_name, reason)
PY
