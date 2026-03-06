#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
cd "$WORKSPACE"

echo "[policy-ci] step=eval-harness"
./scripts/eval-harness.sh >/tmp/policy-ci-eval.log 2>&1 || {
  cat /tmp/policy-ci-eval.log
  echo "[policy-ci] fail=eval-harness"
  exit 10
}
cat /tmp/policy-ci-eval.log

echo "[policy-ci] step=conformance"
./scripts/conformance-check.sh >/tmp/policy-ci-conformance.log 2>&1 || {
  cat /tmp/policy-ci-conformance.log
  echo "[policy-ci] fail=conformance"
  exit 20
}
cat /tmp/policy-ci-conformance.log

EVAL_GATE=$(python3 - <<'PY'
import json
print(json.load(open('/root/.openclaw/workspace/eval/latest-report.json')).get('gate','fail'))
PY
)
CONF_GATE=$(python3 - <<'PY'
import json
print(json.load(open('/root/.openclaw/workspace/eval/conformance-report.json')).get('gate','fail'))
PY
)

if [ "$EVAL_GATE" != "pass" ] || [ "$CONF_GATE" != "pass" ]; then
  echo "[policy-ci] fail=gate eval=$EVAL_GATE conformance=$CONF_GATE"
  exit 30
fi

echo "[policy-ci] step=promote-if-green"
./scripts/promote-if-green.sh >/tmp/policy-ci-promote.log 2>&1 || {
  cat /tmp/policy-ci-promote.log
  echo "[policy-ci] fail=promote"
  exit 40
}
cat /tmp/policy-ci-promote.log

echo "[policy-ci] status=green"
