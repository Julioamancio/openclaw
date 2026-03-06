# Mission Control API Endpoints

## Core

- `GET /` -> dashboard HTML
- `GET /health` -> service + ops probe
- `GET /mc/status` -> runtime status

## Data plane

- `GET /mc/data`
- `POST /mc/data`
- `GET /mc/weather?city=...`

## Activity and alerts

- `GET /mc/activity`
- `POST /mc/activity`
- `GET /mc/alerts` (unsent only)
- `POST /mc/alerts/ack` with `{ "ids": ["..."] }`

## Jobs and reliability

- `GET /mc/jobs`
- `GET /mc/slo`
- `GET /mc/postmortems`
- `POST /mc/postmortems`
- `GET /mc/otserver`

## Notes

- Alerts are auto-created when activity message starts with `ALERTA:`.
- `scripts/ops-job-mark.sh` writes both jobs/runs and activity events.
- `scripts/dispatch-mc-alerts.sh` consumes unsent alerts and ACKs them.
