#!/usr/bin/env bash
set -euo pipefail
BASE="/root/.openclaw/workspace/trade-copilot"
START_FILE="$BASE/data/session_start_24h.txt"
LOG_FILE="$BASE/data/paper-trades.jsonl"

if [ -f "$START_FILE" ]; then
  START_TS="$(cat "$START_FILE")"
else
  START_TS="1970-01-01T00:00:00Z"
fi

python3 - <<'PY'
import json, os, datetime
base='/root/.openclaw/workspace/trade-copilot'
start_file=f'{base}/data/session_start_24h.txt'
log_file=f'{base}/data/paper-trades.jsonl'
start=datetime.datetime.fromisoformat(open(start_file).read().strip().replace('Z','+00:00')) if os.path.exists(start_file) else datetime.datetime(1970,1,1,tzinfo=datetime.timezone.utc)
items=[]
if os.path.exists(log_file):
    with open(log_file,'r',encoding='utf-8') as f:
        for line in f:
            line=line.strip()
            if not line: continue
            try:
                o=json.loads(line)
                dt=datetime.datetime.fromisoformat(o.get('createdAt','1970-01-01T00:00:00+00:00').replace('Z','+00:00'))
                if dt>=start:
                    items.append(o)
            except Exception:
                pass
opens=[x for x in items if str(x.get('status','')).startswith('OPEN')]
closes=[x for x in items if str(x.get('status','')).startswith('CLOSED')]
wins=0
losses=0
pnl=0.0
for c in closes:
    v=float(c.get('pnlUsd') or 0)
    pnl += v
    if v>0: wins +=1
    elif v<0: losses +=1
trades=len(opens)
resolved=max(1,wins+losses)
winrate=(wins/resolved)*100
print('SUMMARY_START')
print(f'P&L: {pnl:.4f} USD')
print(f'Trades made: {trades}')
print(f'Closed trades: {wins+losses}')
print(f'Win rate: {winrate:.2f}% ({wins}W/{losses}L)')
print('SUMMARY_END')
PY
