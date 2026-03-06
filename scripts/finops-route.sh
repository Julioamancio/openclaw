#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
POLICY="$WORKSPACE/finops-policy.json"
METRICS="$WORKSPACE/router-metrics.json"
TEXT="${1:-}"
RISK="${2:-medium}"
BUDGET="${3:-}"

python3 - "$POLICY" "$METRICS" "$TEXT" "$RISK" "$BUDGET" <<'PY'
import json,sys,re
policy_path, metrics_path, text, risk, budget_in = sys.argv[1:6]

policy=json.load(open(policy_path))
try:
    metrics=json.load(open(metrics_path))
except Exception:
    metrics={'models':{}}

costs=policy.get('modelCostsUsdPer1k',{})
def_budget=float(budget_in) if budget_in else float(policy.get('defaults',{}).get('missionBudgetUsd',0.8))

# base route from rule-like heuristic
if re.search(r'incident|postmortem|alerta|outage|falha|rollback|policy', text, re.I) or risk=='high':
    base='openai-codex/gpt-5.3-codex'
else:
    base='nvidia-nim/moonshotai/kimi-k2.5'

lat = ((metrics.get('models') or {}).get(base) or {}).get('avgLatencyMs', 0) or 0
fail_streak = ((metrics.get('models') or {}).get(base) or {}).get('failStreak', 0) or 0

# simple token estimate
est_tokens = 1200 if risk=='high' else (800 if risk=='medium' else 500)
base_cost = (est_tokens/1000.0) * float(costs.get(base, 0.01))

selected=base
reason='base-route'
action='keep'

if base_cost > def_budget:
    # downgrade to cheapest option
    cheapest=min(costs.items(), key=lambda kv: kv[1])[0]
    if cheapest != base:
        selected=cheapest
        action='downgrade'
        reason=f'budget_guard: {base_cost:.4f}>{def_budget:.4f}'

# if risk high and budget allows, upgrade quality
if risk=='high' and selected!='openai-codex/gpt-5.3-codex':
    hi='openai-codex/gpt-5.3-codex'
    hi_cost=(est_tokens/1000.0)*float(costs.get(hi,0.03))
    if hi_cost <= def_budget*1.25 and fail_streak < 3:
        selected=hi
        action='upgrade'
        reason='high-risk quality preference'

# if degraded/high latency, fallback cheaper/reliable
if fail_streak >= 3 or (lat and lat > 8000):
    alt='nvidia-nim/moonshotai/kimi-k2.5' if selected!='nvidia-nim/moonshotai/kimi-k2.5' else 'openai-codex/gpt-5.3-codex'
    selected=alt
    action='downgrade' if alt!='openai-codex/gpt-5.3-codex' else 'upgrade'
    reason='degraded_or_latency_guard'

sel_cost=(est_tokens/1000.0) * float(costs.get(selected, 0.01))

print(f'FINOPS_MODEL={selected}')
print(f'FINOPS_ACTION={action}')
print(f'FINOPS_REASON={reason}')
print(f'FINOPS_BUDGET_USD={def_budget:.4f}')
print(f'FINOPS_EST_TOKENS={est_tokens}')
print(f'FINOPS_EST_COST_USD={sel_cost:.4f}')
PY
