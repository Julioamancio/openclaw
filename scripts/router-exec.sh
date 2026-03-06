#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
ROUTER="$WORKSPACE/scripts/model-route.sh"
AUDIT="$WORKSPACE/scripts/audit-event.sh"
METRICS="$WORKSPACE/scripts/router-metrics-update.sh"
TASK_TEXT="${*:-}"
EXECUTE_MODE="${ROUTER_EXECUTE_MODE:-dry}"   # dry | agent
TIMEOUT_SEC="${ROUTER_TIMEOUT_SEC:-180}"

if [ -z "$TASK_TEXT" ]; then
  echo "Uso: router-exec.sh \"texto da tarefa\""
  exit 1
fi

if [ ! -x "$ROUTER" ]; then
  echo "router script não encontrado: $ROUTER"
  exit 1
fi

START_MS=$(date +%s%3N)
ROUTE_OUT="$($ROUTER "$TASK_TEXT")"
MODEL=$(echo "$ROUTE_OUT" | awk -F= '/^ROUTE_MODEL=/{print $2}')
ROUTE_NAME=$(echo "$ROUTE_OUT" | awk -F= '/^ROUTE_NAME=/{print $2}')
ROUTE_REASON=$(echo "$ROUTE_OUT" | awk -F= '/^ROUTE_REASON=/{print $2}')

RESULT="routed"
NOTES="model=$MODEL route=$ROUTE_NAME reason=$ROUTE_REASON"
EXEC_OUT=""

if [ "$EXECUTE_MODE" = "agent" ]; then
  if command -v openclaw >/dev/null 2>&1; then
    EXEC_OUT=$(openclaw agent --local --message "$TASK_TEXT" --timeout "$TIMEOUT_SEC" --json 2>&1 || true)
    if echo "$EXEC_OUT" | grep -qiE "error|failed|timed out"; then
      RESULT="failed"
    else
      RESULT="ok"
    fi
    NOTES="$NOTES | execute_mode=agent_local"
  else
    RESULT="failed"
    NOTES="$NOTES | openclaw CLI indisponível"
  fi
else
  NOTES="$NOTES | dry_run"
fi

END_MS=$(date +%s%3N)
LAT_MS=$(( END_MS - START_MS ))

if [ -x "$METRICS" ]; then
  "$METRICS" "$MODEL" "$RESULT" "$LAT_MS" "$ROUTE_NAME" >/dev/null 2>&1 || true
fi

if [ -x "$AUDIT" ]; then
  "$AUDIT" "router_exec" "Mike" "$ROUTE_NAME" "medium" "$MODEL" "$RESULT" "$TASK_TEXT" >/dev/null 2>&1 || true
fi

echo "ROUTED_MODEL=$MODEL"
echo "ROUTED_NAME=$ROUTE_NAME"
echo "ROUTED_REASON=$ROUTE_REASON"
echo "EXEC_STATUS=$RESULT"
echo "EXEC_LATENCY_MS=$LAT_MS"
echo "EXEC_NOTES=$NOTES"
if [ -n "$EXEC_OUT" ]; then
  echo "EXEC_OUTPUT<<EOF"
  echo "$EXEC_OUT"
  echo "EOF"
fi
