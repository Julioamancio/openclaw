#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
MSG="${1:-}"
ALERT_ID="${2:-na}"
RUNBOOK_FILE="$WORKSPACE/runbooks.json"
AB_EXPLORE_EVERY="${AB_EXPLORE_EVERY:-5}"  # a cada N execuções força exploração

if [ -z "$MSG" ]; then
  echo "AUTOHEAL_TASK=unknown"
  echo "AUTOHEAL_RESULT=failed"
  echo "AUTOHEAL_LEVEL=3"
  echo "AUTOHEAL_MANUAL_REQUIRED=1"
  echo "AUTOHEAL_NOTES=mensagem vazia"
  exit 1
fi

extract_task() {
  local m="$1"
  local t
  t=$(echo "$m" | sed -E 's/^ALERTA:[[:space:]]*(\[[^]]+\][[:space:]]*)?//; s/[[:space:]]+falhou$//')
  echo "$t"
}

task_key() {
  local t="$1"
  case "$t" in
    *"Gateway"*|*"gateway"*) echo "gateway" ;;
    *"Ideia de Negócio"*) echo "nexo" ;;
    *"Check remetentes"*) echo "daniela" ;;
    *"Heartbeat técnico"*) echo "heartbeat" ;;
    *) echo "unknown" ;;
  esac
}

retry_backoff() {
  local cmd="$1"
  local max_attempts="${2:-2}"
  local base_sleep="${3:-2}"
  local attempt=1
  while [ "$attempt" -le "$max_attempts" ]; do
    if eval "$cmd"; then return 0; fi
    if [ "$attempt" -lt "$max_attempts" ]; then sleep $(( base_sleep * attempt )); fi
    attempt=$(( attempt + 1 ))
  done
  return 1
}

# retorna: ORDER|MODE (exploit/explore)
strategy_plan() {
  local key="$1"
  python3 - "$RUNBOOK_FILE" "$key" "$AB_EXPLORE_EVERY" <<'PY'
import json, sys
p, key, explore_every = sys.argv[1], sys.argv[2], int(sys.argv[3])
try:
    d=json.load(open(p))
    t=d['tasks'].get(key)
    if not t:
        print('l1 l2|exploit')
        raise SystemExit
    default=t.get('defaultOrder',['l1','l2'])
    s=t.get('strategies',{})

    def score(k):
        st=s.get(k,{})
        a=float(st.get('attempts',0) or 0)
        ok=float(st.get('success',0) or 0)
        avg=float(st.get('avgDurationSec',0) or 0)
        success=(ok/a) if a>0 else 0.5
        speed=(1.0/(1.0+avg/30.0)) if avg>0 else 0.5
        return (success*0.8)+(speed*0.2)

    ordered=sorted(default, key=lambda k: score(k), reverse=True)
    total_attempts=sum(int((s.get(k,{}) or {}).get('attempts',0) or 0) for k in default)

    mode='exploit'
    if explore_every > 0 and len(ordered) > 1 and total_attempts > 0 and total_attempts % explore_every == 0:
        # força A/B exploration: troca prioridade do segundo
        ordered=[ordered[1], ordered[0], *ordered[2:]]
        mode='explore'

    print(' '.join(ordered) + '|' + mode)
except Exception:
    print('l1 l2|exploit')
PY
}

update_registry() {
  local key="$1"; local strat="$2"; local ok="$3"; local duration="$4"; local mode="$5"
  python3 - "$RUNBOOK_FILE" "$key" "$strat" "$ok" "$duration" "$mode" <<'PY'
import json, sys
from datetime import datetime, timezone
p,key,strat,ok,duration,mode=sys.argv[1:7]
try:
    d=json.load(open(p))
except Exception:
    raise SystemExit
if key not in d.get('tasks',{}):
    raise SystemExit
st=d['tasks'][key].setdefault('strategies',{}).setdefault(strat,{"attempts":0,"success":0})
st['attempts']=int(st.get('attempts',0))+1
if ok=='1': st['success']=int(st.get('success',0))+1
st['lastResult']='success' if ok=='1' else 'failed'
st['lastAt']=datetime.now(timezone.utc).isoformat()
st['lastMode']=mode

dur=float(duration or 0)
prev=float(st.get('avgDurationSec',0) or 0)
if prev<=0:
    st['avgDurationSec']=round(dur,2)
else:
    st['avgDurationSec']=round((prev*0.7)+(dur*0.3),2)

with open(p,'w',encoding='utf-8') as f:
    json.dump(d,f,ensure_ascii=False,indent=2)
PY
}

run_strategy() {
  local key="$1"; local strat="$2"
  case "$key:$strat" in
    gateway:l1)
      openclaw gateway status >/tmp/autoheal-gateway-status.log 2>&1 && grep -q "Runtime: running" /tmp/autoheal-gateway-status.log || \
      retry_backoff "openclaw gateway restart >/tmp/autoheal-gateway-restart.log 2>&1 && sleep 2 && openclaw gateway status | grep -q 'Runtime: running'" 2 3
      ;;
    gateway:l2)
      retry_backoff "openclaw gateway stop >/tmp/autoheal-gateway-stop.log 2>&1 && sleep 2 && openclaw gateway start >/tmp/autoheal-gateway-start.log 2>&1 && sleep 3 && openclaw gateway status | grep -q 'Runtime: running'" 2 4
      ;;
    nexo:l1)
      retry_backoff "timeout 180s '$WORKSPACE/scripts/run-nexo-task.sh' >/tmp/autoheal-nexo.log 2>&1" 2 3
      ;;
    nexo:l2)
      retry_backoff "openclaw gateway restart >/tmp/autoheal-nexo-gw.log 2>&1 && sleep 2 && timeout 180s '$WORKSPACE/scripts/run-nexo-task.sh' >/tmp/autoheal-nexo.log 2>&1" 2 4
      ;;
    daniela:l1)
      retry_backoff "timeout 180s '$WORKSPACE/scripts/check-emails.sh' >/tmp/autoheal-daniela.log 2>&1" 2 3
      ;;
    daniela:l2)
      retry_backoff "openclaw gateway restart >/tmp/autoheal-daniela-gw.log 2>&1 && sleep 2 && timeout 180s '$WORKSPACE/scripts/check-emails.sh' >/tmp/autoheal-daniela.log 2>&1" 2 4
      ;;
    heartbeat:l1)
      retry_backoff "openclaw gateway status >/tmp/autoheal-heartbeat-gw.log 2>&1 && df -h / >/tmp/autoheal-heartbeat-df.log 2>&1" 2 2
      ;;
    heartbeat:l2)
      retry_backoff "openclaw gateway restart >/tmp/autoheal-heartbeat-restart.log 2>&1 && sleep 2 && openclaw gateway status >/tmp/autoheal-heartbeat-gw.log 2>&1 && df -h / >/tmp/autoheal-heartbeat-df.log 2>&1" 2 4
      ;;
    *) return 1 ;;
  esac
}

TASK="$(extract_task "$MSG")"
KEY="$(task_key "$TASK")"
RESULT="failed"; LEVEL="3"; MANUAL_REQUIRED="1"; NOTES="sem runbook para tarefa: $TASK"

USED_STRATEGY="none"
MODE="exploit"
if [ "$KEY" != "unknown" ]; then
  PLAN="$(strategy_plan "$KEY")"
  ORDER="${PLAN%%|*}"
  MODE="${PLAN##*|}"

  for STRAT in $ORDER; do
    START=$(date +%s)
    if run_strategy "$KEY" "$STRAT"; then
      END=$(date +%s)
      DUR=$(( END - START ))
      update_registry "$KEY" "$STRAT" 1 "$DUR" "$MODE"
      USED_STRATEGY="$STRAT"
      RESULT="healed"
      LEVEL="${STRAT#l}"
      MANUAL_REQUIRED="0"
      NOTES="recuperado com estratégia $STRAT (mode=$MODE, duração=${DUR}s)"
      case "$KEY" in
        nexo) "$WORKSPACE/scripts/ops-job-mark.sh" "Ideia de Negócio" "done" "Nexo" "Auto-heal L$LEVEL: $NOTES" >/dev/null 2>&1 || true ;;
        daniela) "$WORKSPACE/scripts/ops-job-mark.sh" "Check remetentes" "done" "Daniela" "Auto-heal L$LEVEL: $NOTES" >/dev/null 2>&1 || true ;;
        heartbeat) "$WORKSPACE/scripts/ops-job-mark.sh" "Heartbeat técnico" "pending" "Mike" "Auto-heal L$LEVEL: $NOTES" >/dev/null 2>&1 || true ;;
      esac
      break
    else
      END=$(date +%s)
      DUR=$(( END - START ))
      update_registry "$KEY" "$STRAT" 0 "$DUR" "$MODE"
    fi
  done

  if [ "$RESULT" != "healed" ]; then
    LEVEL="3"
    MANUAL_REQUIRED="1"
    NOTES="$KEY falhou após estratégias: $ORDER (mode=$MODE)"
  fi
fi

if [ -x "$WORKSPACE/scripts/audit-event.sh" ]; then
  "$WORKSPACE/scripts/audit-event.sh" "auto_heal" "Mike" "$TASK" "runtime" "$USED_STRATEGY/$MODE" "$RESULT" "$NOTES" >/dev/null 2>&1 || true
fi

echo "AUTOHEAL_TASK=$TASK"
echo "AUTOHEAL_RESULT=$RESULT"
echo "AUTOHEAL_LEVEL=$LEVEL"
echo "AUTOHEAL_MANUAL_REQUIRED=$MANUAL_REQUIRED"
echo "AUTOHEAL_NOTES=$NOTES"
