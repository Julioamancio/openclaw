#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
TARGET="${MC_ALERT_TARGET:-720093594}"

REPORT_JSON="$WORKSPACE/eval/latest-report.json"
REPORT_MD="$WORKSPACE/eval/latest-report.md"

$WORKSPACE/scripts/eval-harness.sh >/tmp/eval-harness-run.log 2>&1 || true

if [ ! -f "$REPORT_JSON" ]; then
  echo "[eval-daily] missing report"
  exit 0
fi

gate=$(python3 - <<'PY'
import json
print(json.load(open('/root/.openclaw/workspace/eval/latest-report.json')).get('gate','fail'))
PY
)
score=$(python3 - <<'PY'
import json
print(json.load(open('/root/.openclaw/workspace/eval/latest-report.json')).get('score',0))
PY
)

if [ "$gate" = "pass" ]; then
  echo "[eval-daily] gate pass score=$score"
  exit 0
fi

msg="🔴 *Eval Gate FAIL*\n\nScore: $score\nGate: $gate\nArquivo: eval/latest-report.md\nAção: revisar cenários com falha antes de promover mudanças."
if command -v openclaw >/dev/null 2>&1; then
  openclaw message send --channel "$CHANNEL" --to "$TARGET" --message "$msg" >/dev/null 2>&1 || true
fi

# queue alert into activity
curl -fsS -X POST http://127.0.0.1:8899/mc/activity -H "Content-Type: application/json" \
  -d "{\"title\":\"Eval Harness\",\"message\":\"ALERTA: Eval gate fail (score $score)\"}" >/dev/null 2>&1 || true

echo "[eval-daily] gate fail alerted"
