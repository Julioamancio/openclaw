#!/usr/bin/env bash
set -euo pipefail

# Auto profile switcher for self-improving skill
# Usage:
#   auto-self-improving-profile.sh [context]
# Examples:
#   auto-self-improving-profile.sh heartbeat
#   auto-self-improving-profile.sh backup
#   auto-self-improving-profile.sh deploy

CONTEXT_RAW="${1:-heartbeat}"
CONTEXT="$(echo "$CONTEXT_RAW" | tr '[:upper:]' '[:lower:]')"
SETTER="/root/.openclaw/workspace/scripts/set-self-improving-profile.sh"
LOG_FILE="/root/.openclaw/workspace/logs/self-improving-profile.log"

mkdir -p /root/.openclaw/workspace/logs

if [[ ! -x "$SETTER" ]]; then
  echo "Setter script not found: $SETTER"
  exit 1
fi

# Priority 1: explicit override (env)
if [[ -n "${FORCE_SELF_PROFILE:-}" ]]; then
  PROFILE="$(echo "$FORCE_SELF_PROFILE" | tr '[:upper:]' '[:lower:]')"
  case "$PROFILE" in
    fast|default|guardian)
      "$SETTER" "$PROFILE" >/dev/null
      echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] context=$CONTEXT override=$PROFILE" >> "$LOG_FILE"
      echo "$PROFILE"
      exit 0
      ;;
  esac
fi

# Priority 2: critical contexts
if [[ "$CONTEXT" =~ (backup|deploy|migration|security|firewall|production|guardian|critical|rollback) ]]; then
  PROFILE="guardian"
# Priority 3: quick contexts
elif [[ "$CONTEXT" =~ (quick|fast|chat|trivial) ]]; then
  PROFILE="fast"
else
  # Priority 4: schedule-based default
  HOUR_UTC="$(date -u '+%H')"
  HOUR_UTC=$((10#$HOUR_UTC))

  # 11:00-22:59 UTC = business/ops window -> default
  # 23:00-10:59 UTC = low-latency/off-hours -> fast
  if (( HOUR_UTC >= 11 && HOUR_UTC <= 22 )); then
    PROFILE="default"
  else
    PROFILE="fast"
  fi
fi

"$SETTER" "$PROFILE" >/dev/null
echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] context=$CONTEXT selected=$PROFILE" >> "$LOG_FILE"
echo "$PROFILE"
