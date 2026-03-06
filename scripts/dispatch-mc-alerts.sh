#!/bin/bash
set -euo pipefail

BASE_URL="http://127.0.0.1:8899"
TMP_JSON="/tmp/mc-alerts.json"
TARGET_CHAT="${MC_ALERT_TARGET:-720093594}"
CHANNEL="${MC_ALERT_CHANNEL:-telegram}"
LOCK_FILE="/tmp/dispatch-mc-alerts.lock"
HTTP_TIMEOUT_SEC="${HTTP_TIMEOUT_SEC:-20}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[mc-alerts] lock ativo, execução concorrente ignorada"
  exit 0
fi

timeout "$HTTP_TIMEOUT_SEC" curl -fsS "$BASE_URL/mc/alerts" -o "$TMP_JSON" || {
  echo "[mc-alerts] Falha ao consultar /mc/alerts"
  exit 0
}

COUNT=$(python3 - <<'PY'
import json
from pathlib import Path
p=Path('/tmp/mc-alerts.json')
try:
    data=json.loads(p.read_text())
    print(len(data) if isinstance(data,list) else 0)
except Exception:
    print(0)
PY
)

if [ "$COUNT" -eq 0 ]; then
  echo "[mc-alerts] Sem alertas pendentes"
  exit 0
fi

python3 - <<'PY'
import json
from pathlib import Path
items=json.loads(Path('/tmp/mc-alerts.json').read_text())
print('🚨 Mission Control — Alertas pendentes')
for a in items[:10]:
    print(f"- {a.get('created_at','--')} | {a.get('message','(sem mensagem)')}")
ids=[a.get('id') for a in items if a.get('id')]
Path('/tmp/mc-alert-ids.json').write_text(json.dumps({'ids':ids}))
Path('/tmp/mc-alert-items.json').write_text(json.dumps(items[:10]))
PY

python3 - <<'PY'
import json, subprocess
from pathlib import Path

items=json.loads(Path('/tmp/mc-alert-items.json').read_text())
summary=["🚨 *Mission Control — Alertas*",""]
priority=["🔴 *PRIORITY ESCALATION (L3)*",""]
priority_count=0

map_cfg={}
try:
    map_cfg=json.loads(Path('/root/.openclaw/workspace/oncall-map.json').read_text())
except Exception:
    map_cfg={"default":{"owner":"Julio","channel":"telegram","target":"720093594","slaMinutes":15},"routes":[]}

def route_for(incident:str):
    import re
    for r in map_cfg.get('routes',[]):
        if re.search(r.get('match',''), incident or '', re.I):
            return r
    return map_cfg.get('default',{})

for a in items:
    msg=a.get('message','Alerta sem mensagem')
    aid=a.get('id','na')
    created=a.get('created_at','--')

    # state machine: detected -> assessed
    subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','upsert',aid,'detected',msg], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','transition',aid,'assessed','risk assessment start'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # risk scoring
    risk_score='60'; risk_level='medium'; risk_require='0'
    try:
        rp=subprocess.run([
          '/root/.openclaw/workspace/scripts/risk-score.sh', msg
        ], capture_output=True, text=True, timeout=20)
        rkv={}
        for line in rp.stdout.splitlines():
            if '=' in line:
                k,v=line.split('=',1)
                rkv[k.strip()]=v.strip()
        risk_score=rkv.get('RISK_SCORE','60')
        risk_level=rkv.get('RISK_LEVEL','medium')
        risk_require=rkv.get('RISK_REQUIRE_CONFIRMATION','0')
    except Exception:
        pass

    healed=False
    heal_notes='auto-heal não executado'
    task='desconhecida'
    heal_level='3'
    manual_required='1'

    # policy engine gate for auto-heal
    pol_allow='1'; pol_reason='';
    try:
        pc=subprocess.run([
          '/root/.openclaw/workspace/scripts/policy-check.sh',
          'auto_heal',
          risk_level,
          '0' if str(risk_require)=='1' else '1',
          '1',
          '1'
        ], capture_output=True, text=True, timeout=15)
        pvals={}
        for ln in pc.stdout.splitlines():
            if '=' in ln:
                k,v=ln.split('=',1); pvals[k.strip()]=v.strip()
        pol_allow=pvals.get('POLICY_ALLOW','1')
        pol_reason=pvals.get('POLICY_REASON','')
    except Exception:
        pass

    if str(pol_allow) != '1':
        subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','transition',aid,'blocked',f'policy_block: {pol_reason}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['/root/.openclaw/workspace/scripts/audit-event.sh','policy_block','PolicyEngine',msg,risk_level,'auto_heal','blocked',pol_reason], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        heal_notes=f'bloqueado por policy: {pol_reason} (risk={risk_level}:{risk_score})'
        manual_required='1'
        heal_level='3'
    else:
        subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','transition',aid,'approved','policy check passed'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            p=subprocess.run([
                '/root/.openclaw/workspace/scripts/auto-heal.sh',
                msg,
                aid
            ], capture_output=True, text=True, timeout=220)
            kv={}
            for line in p.stdout.splitlines():
                if '=' in line:
                    k,v=line.split('=',1)
                    kv[k.strip()]=v.strip()
            healed=(kv.get('AUTOHEAL_RESULT')=='healed')
            heal_notes=kv.get('AUTOHEAL_NOTES', heal_notes)
            task=kv.get('AUTOHEAL_TASK', task)
            heal_level=kv.get('AUTOHEAL_LEVEL', heal_level)
            manual_required=kv.get('AUTOHEAL_MANUAL_REQUIRED', manual_required)
        except Exception as e:
            heal_notes=f'erro auto-heal: {e}'

    status='closed' if healed else 'open'
    action='Auto-heal aplicado com sucesso' if healed else 'Despacho de alerta + ACK em fila'

    # state machine final
    if healed:
        subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','transition',aid,'healed',heal_notes], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','transition',aid,'closed','healed and closed'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif str(manual_required) == '1':
        subprocess.run(['/root/.openclaw/workspace/scripts/incident-state.sh','transition',aid,'escalated',heal_notes], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    payload={
      'incident': msg,
      'probable_cause': 'Falha operacional detectada automaticamente',
      'action_taken': f"{action} | risk={risk_level}:{risk_score} | level={heal_level} | {heal_notes}",
      'prevention': 'Revisar runbook e fortalecer monitoramento',
      'status': status
    }
    subprocess.run([
      'curl','-fsS','-X','POST','http://127.0.0.1:8899/mc/postmortems',
      '-H','Content-Type: application/json',
      '-d',json.dumps(payload)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if healed:
      summary.append(f"♻️ {msg}")
      summary.append(f"   {created} · risk={risk_level}:{risk_score} · L{heal_level} · auto-heal: {heal_notes}")
    else:
      summary.append(f"🚨 {msg}")
      summary.append(f"   {created} · risk={risk_level}:{risk_score} · L{heal_level} · ação manual: necessária ({heal_notes})")
      if str(manual_required) == '1' and str(heal_level) == '3':
        r=route_for(msg)
        priority_count += 1
        priority.append(f"• {msg}")
        priority.append(f"  {created} · task={task} · owner={r.get('owner','OnCall')} · SLA={r.get('slaMinutes',15)}m")
        priority.append(f"  ação: {heal_notes}")

Path('/tmp/mc-alert-message.txt').write_text('\n'.join(summary))
Path('/tmp/mc-alert-priority.txt').write_text('\n'.join(priority) if priority_count > 0 else '')
PY

if command -v openclaw >/dev/null 2>&1; then
  MSG=$(cat /tmp/mc-alert-message.txt)
  openclaw message send --channel "$CHANNEL" --to "$TARGET_CHAT" --message "$MSG" >/dev/null 2>&1 || true

  PRIORITY_MSG=$(cat /tmp/mc-alert-priority.txt)
  if [ -n "$PRIORITY_MSG" ]; then
    openclaw message send --channel "$CHANNEL" --to "$TARGET_CHAT" --message "$PRIORITY_MSG" >/dev/null 2>&1 || true
  fi
fi

timeout "$HTTP_TIMEOUT_SEC" curl -fsS -X POST "$BASE_URL/mc/alerts/ack" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/mc-alert-ids.json >/dev/null || true

echo "[mc-alerts] $COUNT alerta(s) processado(s), auto-heal tentado, postmortem gerado e ACK"
