#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
POLICY_FILE="$WORKSPACE/policies.json"

ACTION="${1:-}"
RISK_LEVEL="${2:-medium}"
APPROVED="${3:-0}"
HAS_SNAPSHOT="${4:-1}"
VALID_TRANSITION="${5:-1}"

python3 - "$POLICY_FILE" "$ACTION" "$RISK_LEVEL" "$APPROVED" "$HAS_SNAPSHOT" "$VALID_TRANSITION" <<'PY'
import json, sys
p, action, risk, approved, has_snapshot, valid_transition = sys.argv[1:7]
approved = approved in ('1','true','True')
has_snapshot = has_snapshot in ('1','true','True')
valid_transition = valid_transition in ('1','true','True')

try:
    cfg=json.load(open(p))
except Exception:
    print('POLICY_ALLOW=1')
    print('POLICY_REASON=no-policy-file')
    print('POLICY_RULE=default')
    raise SystemExit

for r in cfg.get('rules',[]):
    if r.get('action') != action:
        continue
    w = r.get('when',{})
    matched=True
    if 'riskLevelIn' in w and risk not in w['riskLevelIn']:
        matched=False
    if 'approved' in w and approved != bool(w['approved']):
        matched=False
    if 'hasSnapshot' in w and has_snapshot != bool(w['hasSnapshot']):
        matched=False
    if 'validTransition' in w and valid_transition != bool(w['validTransition']):
        matched=False

    if matched and r.get('effect')=='deny':
        print('POLICY_ALLOW=0')
        print(f"POLICY_REASON={r.get('reason','denied by policy')}")
        print(f"POLICY_RULE={r.get('id','rule')}")
        raise SystemExit

default=cfg.get('default',{})
print('POLICY_ALLOW=1')
print(f"POLICY_REASON={default.get('reason','allowed')}")
print('POLICY_RULE=default')
PY
