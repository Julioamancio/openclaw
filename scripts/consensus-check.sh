#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
POLICY="$WORKSPACE/consensus-policy.json"
METRICS="$WORKSPACE/router-metrics.json"
TASK_TEXT="${1:-}"
RISK_LEVEL="${2:-medium}"

python3 - "$POLICY" "$METRICS" "$TASK_TEXT" "$RISK_LEVEL" <<'PY'
import json, sys
policy_path, metrics_path, task, risk = sys.argv[1:5]

try:
    pol=json.load(open(policy_path))
except Exception:
    pol={"enabled":False}
try:
    met=json.load(open(metrics_path))
except Exception:
    met={"models":{}}

if not pol.get('enabled', True):
    print('CONSENSUS_ALLOW=1')
    print('CONSENSUS_REASON=disabled')
    raise SystemExit

if risk != 'high':
    print('CONSENSUS_ALLOW=1')
    print('CONSENSUS_REASON=not_high_risk')
    raise SystemExit

cfg=pol.get('highRisk',{})
required=int(cfg.get('requiredModels',2))
min_agreement=float(cfg.get('minAgreement',0.66))
min_score=float(cfg.get('minScore',70))

rows=[]
for model,m in (met.get('models') or {}).items():
    attempts=float(m.get('attempts',0) or 0)
    success=float(m.get('success',0) or 0)
    sr=(success/attempts*100) if attempts>0 else 0
    fail_streak=int(m.get('failStreak',0) or 0)
    penalty=20 if fail_streak>=3 else 0
    score=max(0, sr-penalty)
    rows.append((model, score))

rows.sort(key=lambda x: x[1], reverse=True)
selected=[r for r in rows[:required] if r[1] >= min_score]

if len(selected) < required:
    print('CONSENSUS_ALLOW=0')
    print(f"CONSENSUS_REASON=insufficient_models_above_score:{len(selected)}/{required}")
    print('CONSENSUS_MODELS=' + ','.join([f"{m}:{s:.1f}" for m,s in rows[:required]]))
    raise SystemExit

# agreement proxy: normalized score proximity among selected
scores=[s for _,s in selected]
mx=max(scores); mn=min(scores)
agreement=1.0 if mx==0 else max(0.0, 1.0 - ((mx-mn)/100.0))

if agreement < min_agreement:
    print('CONSENSUS_ALLOW=0')
    print(f"CONSENSUS_REASON=low_agreement:{agreement:.2f}<{min_agreement}")
    print('CONSENSUS_MODELS=' + ','.join([f"{m}:{s:.1f}" for m,s in selected]))
    raise SystemExit

print('CONSENSUS_ALLOW=1')
print(f"CONSENSUS_REASON=quorum_ok:{agreement:.2f}")
print('CONSENSUS_MODELS=' + ','.join([f"{m}:{s:.1f}" for m,s in selected]))
PY
