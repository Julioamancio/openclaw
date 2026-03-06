#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
JOBS_FILE="$WORKSPACE/mc-jobs.json"
STAMP_FILE="/tmp/anomaly-hourly-guard-stamp"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
TARGET="${MC_ALERT_TARGET:-720093594}"

if [ ! -f "$JOBS_FILE" ]; then
  echo "[anomaly-hourly] no jobs file"
  exit 0
fi

OUT=$(python3 - "$JOBS_FILE" <<'PY'
import json, sys
from datetime import datetime, timezone, timedelta

p=sys.argv[1]
d=json.load(open(p))
runs=d.get('runs',[])
now=datetime.now(timezone.utc)
current_hour=now.hour
start_7d=now-timedelta(days=7)

def ts(r):
    try:
        return datetime.fromisoformat(str(r.get('ts','')).replace('Z','+00:00'))
    except Exception:
        return None

recent=[r for r in runs if (ts(r) and ts(r)>=start_7d)]
cur=[r for r in recent if ts(r).hour==current_hour and str(r.get('status','')).lower()=='failed']
# baseline: média de falhas por hora nas demais horas
hour_buckets={h:0 for h in range(24)}
for r in recent:
    t=ts(r)
    if not t: continue
    if str(r.get('status','')).lower()=='failed':
        hour_buckets[t.hour]+=1
others=[v for h,v in hour_buckets.items() if h!=current_hour]
baseline=(sum(others)/len(others)) if others else 0
current=len(cur)
threshold=max(2, int(round(baseline*2 + 1)))
print(f"current={current}")
print(f"baseline={baseline:.2f}")
print(f"threshold={threshold}")
print(f"alert={1 if current>=threshold and current>0 else 0}")
PY
)

current=$(echo "$OUT" | awk -F= '/^current=/{print $2}')
baseline=$(echo "$OUT" | awk -F= '/^baseline=/{print $2}')
threshold=$(echo "$OUT" | awk -F= '/^threshold=/{print $2}')
alert=$(echo "$OUT" | awk -F= '/^alert=/{print $2}')

if [ "$alert" != "1" ]; then
  echo "[anomaly-hourly] ok current=$current baseline=$baseline threshold=$threshold"
  exit 0
fi

# rate-limit 1h
now=$(date +%s)
last=0
[ -f "$STAMP_FILE" ] && last=$(cat "$STAMP_FILE" 2>/dev/null || echo 0)
if [ $((now-last)) -lt 3600 ]; then
  echo "[anomaly-hourly] suppressed"
  exit 0
fi
echo "$now" > "$STAMP_FILE"

msg="⚠️ *Anomalia por horário detectada*\n\nFalhas nesta hora: $current\nBaseline (7d): $baseline\nThreshold: $threshold\nAção: revisar jobs/runs desta janela."
if command -v openclaw >/dev/null 2>&1; then
  openclaw message send --channel "$CHANNEL" --to "$TARGET" --message "$msg" >/dev/null 2>&1 || true
fi

echo "[anomaly-hourly] alert sent"
