---
name: mission-control-ops
description: Operate and harden Mission Control operational workflows (jobs, alerts, postmortems, health probes, cron observability). Use when setting up or troubleshooting dashboard health, job status tracking, alert dispatch, or operational telemetry for OpenClaw Mission Control.
---

# Mission Control Ops

Use this skill to keep Mission Control operationally reliable.

## Execute the standard flow

1. Validate service health.
2. Validate job/runs data integrity.
3. Validate alerts pipeline end-to-end.
4. Validate postmortem creation path.
5. Apply fixes and re-test.

## Runbook commands

Run from `/root/.openclaw/workspace`.

### 1) Health probe

```bash
curl -sS http://127.0.0.1:8899/health
```

Expect `status: "ok"`.

### 2) Jobs and activity snapshot

```bash
curl -sS http://127.0.0.1:8899/mc/jobs
curl -sS http://127.0.0.1:8899/mc/activity
```

Ensure key jobs exist:
- Check remetentes
- Ideia de Negócio
- Backup GitHub
- Heartbeat técnico

### 3) Mark job status safely

```bash
./scripts/ops-job-mark.sh "Check remetentes" "running" "Daniela" "Execução iniciada"
./scripts/ops-job-mark.sh "Check remetentes" "done" "Daniela" "Execução concluída"
```

Use statuses: `running`, `done`, `failed`, `pending`.

### 4) Process alert queue

```bash
./scripts/dispatch-mc-alerts.sh
```

This should:
- collect `/mc/alerts`
- send message notification (best effort)
- create postmortem draft
- ACK sent alerts

### 5) Verify cron wiring

```bash
crontab -l
```

Expect schedules in UTC:
- 11:00 and 19:00 -> `scripts/check-emails.sh`
- 12:00 -> `scripts/run-nexo-task.sh`
- periodic alert dispatcher

## Troubleshooting

- Restart Mission Control server:
```bash
pkill -f "node /root/.openclaw/workspace/server.js" || true
nohup node /root/.openclaw/workspace/server.js >/tmp/mission-control-server.log 2>&1 &
```

- Validate script syntax before changes:
```bash
bash -n scripts/check-emails.sh
bash -n scripts/run-nexo-task.sh
bash -n scripts/dispatch-mc-alerts.sh
node --check server.js
```

## References

Read `references/endpoints.md` when editing API routes or validating payload contracts.
