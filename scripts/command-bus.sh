#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
ACTION="${1:-}"
INCIDENT_ID="${2:-manual}"
TASK="${3:-unknown}"
RISK_LEVEL="${4:-medium}"
CMD="${5:-true}"

if [ -z "$ACTION" ]; then
  echo "Uso: command-bus.sh <action> <incident_id> <task> <risk_level> [cmd]"
  exit 1
fi

MODE_OUT="$($WORKSPACE/scripts/sre-mode.sh get)"
SRE_MODE=$(echo "$MODE_OUT" | awk -F= '/^SRE_MODE=/{print $2}')

# 1) policy gate
POL_OUT="$($WORKSPACE/scripts/policy-check.sh "$ACTION" "$RISK_LEVEL" 0 1 1 || true)"
ALLOW=$(echo "$POL_OUT" | awk -F= '/^POLICY_ALLOW=/{print $2}')
PREASON=$(echo "$POL_OUT" | awk -F= '/^POLICY_REASON=/{print $2}')

if [ "$ALLOW" != "1" ]; then
  $WORKSPACE/scripts/incident-state.sh upsert "$INCIDENT_ID" detected "$TASK" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" assessed "policy check" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" blocked "policy deny: $PREASON" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/audit-event.sh command_bus PolicyEngine "$TASK" "$RISK_LEVEL" "$ACTION" blocked "$PREASON" >/dev/null 2>&1 || true
  echo "BUS_STATUS=blocked"
  echo "BUS_REASON=$PREASON"
  exit 2
fi

# 2) state pre
$WORKSPACE/scripts/incident-state.sh upsert "$INCIDENT_ID" detected "$TASK" >/dev/null 2>&1 || true
$WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" assessed "policy allow" >/dev/null 2>&1 || true

# 3) consensus gate (high-risk)
if [ "$RISK_LEVEL" = "high" ]; then
  CONS="$($WORKSPACE/scripts/consensus-check.sh "$TASK" "$RISK_LEVEL" || true)"
  C_ALLOW=$(echo "$CONS" | awk -F= '/^CONSENSUS_ALLOW=/{print $2}')
  C_REASON=$(echo "$CONS" | awk -F= '/^CONSENSUS_REASON=/{print $2}')
  C_MODELS=$(echo "$CONS" | awk -F= '/^CONSENSUS_MODELS=/{print $2}')
  if [ "$C_ALLOW" != "1" ]; then
    $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" blocked "consensus deny: $C_REASON" >/dev/null 2>&1 || true
    $WORKSPACE/scripts/audit-event.sh consensus_gate PolicyEngine "$TASK" "$RISK_LEVEL" "$ACTION" blocked "$C_REASON | $C_MODELS" >/dev/null 2>&1 || true
    echo "BUS_STATUS=blocked"
    echo "BUS_REASON=consensus_deny:$C_REASON"
    exit 5
  fi
  $WORKSPACE/scripts/audit-event.sh consensus_gate PolicyEngine "$TASK" "$RISK_LEVEL" "$ACTION" approved "$C_REASON | $C_MODELS" >/dev/null 2>&1 || true
fi

# 4) mode gate
if [ "$SRE_MODE" = "observe" ]; then
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" escalated "observe mode: no execution" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/audit-event.sh command_bus Mike "$TASK" "$RISK_LEVEL" "$ACTION" observe_no_exec "mode=observe" >/dev/null 2>&1 || true
  echo "BUS_STATUS=observe"
  echo "BUS_REASON=mode_observe"
  exit 0
fi

if [ "$SRE_MODE" = "assist" ] && [ "$RISK_LEVEL" = "high" ]; then
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" blocked "assist mode blocks high-risk" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/audit-event.sh command_bus Mike "$TASK" "$RISK_LEVEL" "$ACTION" blocked "assist_mode_high_risk" >/dev/null 2>&1 || true
  echo "BUS_STATUS=blocked"
  echo "BUS_REASON=assist_mode_high_risk"
  exit 3
fi

# 4) execute
$WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" approved "execution allowed by mode=$SRE_MODE" >/dev/null 2>&1 || true
if sh -c "$CMD" >/tmp/command-bus-exec.log 2>&1; then
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" healed "command success" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" closed "command bus closed" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/audit-event.sh command_bus Mike "$TASK" "$RISK_LEVEL" "$ACTION" executed "mode=$SRE_MODE" >/dev/null 2>&1 || true
  echo "BUS_STATUS=executed"
  echo "BUS_REASON=ok"
else
  $WORKSPACE/scripts/incident-state.sh transition "$INCIDENT_ID" escalated "command failed" >/dev/null 2>&1 || true
  $WORKSPACE/scripts/audit-event.sh command_bus Mike "$TASK" "$RISK_LEVEL" "$ACTION" failed "mode=$SRE_MODE" >/dev/null 2>&1 || true
  echo "BUS_STATUS=failed"
  echo "BUS_REASON=cmd_failed"
  exit 4
fi
