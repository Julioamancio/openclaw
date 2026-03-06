#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
JOBS_FILE="$WORKSPACE/mc-jobs.json"
BASE_URL="http://127.0.0.1:8899"

if [ ! -f "$JOBS_FILE" ]; then
  echo "[daily-ops-report] mc-jobs.json não encontrado"
  exit 0
fi

SUMMARY=$(python3 - "$JOBS_FILE" <<'PY'
import json,sys
from datetime import datetime, timezone
f=sys.argv[1]
obj=json.load(open(f,'r',encoding='utf-8'))
jobs=obj.get('jobs',[])

done=sum(1 for j in jobs if j.get('status')=='done')
failed=sum(1 for j in jobs if j.get('status')=='failed')
pending=sum(1 for j in jobs if j.get('status') not in ('done','failed'))

lines=[]
lines.append(f"Relatório diário Ops: {done} concluídas, {pending} pendentes, {failed} falhas")
for j in jobs:
    lines.append(f"- {j.get('task','job')}: {j.get('status','pending')}")
print("\\n".join(lines))
PY
)

# salva no activity feed
SUMMARY_JSON=$(printf '%s' "$SUMMARY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
curl -fsS -X POST "$BASE_URL/mc/activity" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Daily Ops Report\",\"message\":${SUMMARY_JSON}}" >/dev/null || true

# se houve falha, cria alerta de exceção
if echo "$SUMMARY" | grep -q "falhas"; then
  FAILED_COUNT=$(echo "$SUMMARY" | sed -n 's/.*\([0-9]\+\) falhas.*/\1/p' | head -n1)
  if [ "${FAILED_COUNT:-0}" -gt 0 ]; then
    curl -fsS -X POST "$BASE_URL/mc/activity" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"Daily Ops Report\",\"message\":\"ALERTA: Daily Ops com ${FAILED_COUNT} falha(s)\"}" >/dev/null || true
  fi
fi

echo "[daily-ops-report] enviado"
