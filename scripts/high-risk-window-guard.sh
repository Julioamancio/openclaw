#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
PM_FILE="$WORKSPACE/mc-postmortems.json"
STAMP_FILE="/tmp/high-risk-window-guard-stamps.json"
WINDOW_MIN="${HIGH_RISK_APPROVAL_WINDOW_MIN:-30}"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
TARGET="${MC_ALERT_TARGET:-720093594}"

python3 - <<'PY'
import json, subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

pm_file=Path('/root/.openclaw/workspace/mc-postmortems.json')
stamp_file=Path('/tmp/high-risk-window-guard-stamps.json')
window_min=int(__import__('os').environ.get('HIGH_RISK_APPROVAL_WINDOW_MIN','30'))

if not pm_file.exists():
    raise SystemExit(0)

pms=json.loads(pm_file.read_text())
stamps=json.loads(stamp_file.read_text()) if stamp_file.exists() else {}
now=datetime.now(timezone.utc)
changed=False

for p in pms:
    if str(p.get('status','')).lower()!='open':
        continue
    action=str(p.get('action_taken',''))
    incident=str(p.get('incident',''))
    # foco: high-risk aguardando confirmação humana
    if 'aguardando confirmação humana' not in action:
        continue

    created=p.get('created_at')
    try:
        dt=datetime.fromisoformat(str(created).replace('Z','+00:00'))
    except Exception:
        continue

    age_min=int((now-dt).total_seconds()//60)
    if age_min < window_min:
        continue

    key=p.get('id') or incident
    last=stamps.get(key)
    if last:
        try:
            last_dt=datetime.fromisoformat(last)
            if (now-last_dt).total_seconds() < window_min*60:
                continue
        except Exception:
            pass

    msg=(
      '🔴 *High-Risk sem aprovação*\n\n'
      f'• incidente: {incident}\n'
      f'• aberto há: {age_min} min\n'
      f'• janela de aprovação: {window_min} min\n'
      '• ação: aprovar no Mission Control ou intervir manualmente.'
    )

    subprocess.run([
      'openclaw','message','send','--channel',
      __import__('os').environ.get('MC_ALERT_CHANNEL','telegram'),
      '--to',
      __import__('os').environ.get('MC_ALERT_TARGET','720093594'),
      '--message',msg
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # trilha de auditoria
    p['action_taken'] = (action + f" | approval_window_breach:{now.isoformat()}").strip()
    stamps[key]=now.isoformat()
    changed=True

if changed:
    pm_file.write_text(json.dumps(pms, ensure_ascii=False, indent=2))
    stamp_file.write_text(json.dumps(stamps, ensure_ascii=False, indent=2))
PY

echo "[high-risk-window-guard] checked"
