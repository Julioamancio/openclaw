#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
POLICY="$WORKSPACE/risk-policy.json"
TEXT="${1:-}"

if [ -z "$TEXT" ]; then
  echo "RISK_SCORE=60"
  echo "RISK_LEVEL=medium"
  echo "RISK_REQUIRE_CONFIRMATION=0"
  echo "RISK_RULE=default-empty"
  exit 0
fi

python3 - "$POLICY" "$TEXT" <<'PY'
import json, re, sys
p, text = sys.argv[1], sys.argv[2]

def out(score, level, req, rule):
    print(f"RISK_SCORE={int(score)}")
    print(f"RISK_LEVEL={level}")
    print(f"RISK_REQUIRE_CONFIRMATION={1 if req else 0}")
    print(f"RISK_RULE={rule}")

try:
    cfg=json.load(open(p))
except Exception:
    out(60,'medium',False,'default-no-policy')
    raise SystemExit

for r in cfg.get('rules',[]):
    if re.search(r.get('match',''), text, re.I):
        out(r.get('score',60), r.get('level','medium'), r.get('requireConfirmation',False), r.get('match','rule'))
        raise SystemExit

d=cfg.get('default',{})
out(d.get('score',60), d.get('level','medium'), d.get('requireConfirmation',False), 'default')
PY
