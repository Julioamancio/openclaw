#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
EVAL_JSON="$WORKSPACE/eval/latest-report.json"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
TARGET="${MC_ALERT_TARGET:-720093594}"

if [ ! -f "$EVAL_JSON" ]; then
  echo "[promote] missing eval report"
  exit 1
fi

EVAL_GATE=$(python3 - <<'PY'
import json
print(json.load(open('/root/.openclaw/workspace/eval/latest-report.json')).get('gate','fail'))
PY
)

POLICY_BLOCKS=$(python3 - <<'PY'
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
p=Path('/root/.openclaw/workspace/audit-log.jsonl')
if not p.exists():
 print(0); raise SystemExit
now=datetime.now(timezone.utc)
d24=now-timedelta(hours=24)
count=0
for ln in p.read_text(encoding='utf-8').splitlines():
 if not ln.strip():
  continue
 try:
  e=json.loads(ln)
  ts=datetime.fromisoformat(str(e.get('ts','')).replace('Z','+00:00'))
 except Exception:
  continue
 if ts<d24:
  continue
 if str(e.get('type',''))=='policy_block':
  count+=1
print(count)
PY
)

if [ "$EVAL_GATE" != "pass" ] || [ "$POLICY_BLOCKS" -gt 0 ]; then
  MSG="⚠️ *Promotion blocked*\n\nEval gate: $EVAL_GATE\nPolicy blocks (24h): $POLICY_BLOCKS\nAção: corrigir pendências antes de promover."
  if command -v openclaw >/dev/null 2>&1; then
    openclaw message send --channel "$CHANNEL" --to "$TARGET" --message "$MSG" >/dev/null 2>&1 || true
  fi
  /root/.openclaw/workspace/scripts/audit-event.sh "promotion_gate" "PolicyEngine" "promote-if-green" "high" "gate" "blocked" "eval=$EVAL_GATE policy_blocks=$POLICY_BLOCKS" >/dev/null 2>&1 || true
  echo "[promote] blocked"
  exit 2
fi

# Promotion marker (can be used by deploy pipeline)
STAMP="$WORKSPACE/.promotion-green"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$STAMP"
/root/.openclaw/workspace/scripts/audit-event.sh "promotion_gate" "PolicyEngine" "promote-if-green" "low" "gate" "approved" "eval=$EVAL_GATE policy_blocks=$POLICY_BLOCKS" >/dev/null 2>&1 || true

echo "[promote] approved"
