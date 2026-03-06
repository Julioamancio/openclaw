#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawnSync } = require('child_process');
const { URL } = require('url');

const PORT = 8899;
const HOST = '0.0.0.0';

const ROOT = __dirname;
const DASHBOARD_FILE = path.join(ROOT, 'mission-control.html');
const DATA_FILE = path.join(ROOT, 'mc-data.json');
const ACTIVITY_FILE = path.join(ROOT, 'mc-activity.json');
const ALERTS_FILE = path.join(ROOT, 'mc-alerts.json');
const JOBS_FILE = path.join(ROOT, 'mc-jobs.json');
const POSTMORTEMS_FILE = path.join(ROOT, 'mc-postmortems.json');
const RUNBOOKS_FILE = path.join(ROOT, 'runbooks.json');
const INCIDENT_STATE_FILE = path.join(ROOT, 'incident-state.json');
const CAPABILITIES_FILE = path.join(ROOT, 'capabilities.json');
const MISSION_RUNS_FILE = path.join(ROOT, 'mission-runs.json');
const REPLAY_LIBRARY_FILE = path.join(ROOT, 'replay-library.json');
const TWIN_STATE_FILE = path.join(ROOT, 'twin-state.json');
const REPLAY_RUNS_FILE = path.join(ROOT, 'replay-runs.json');
const FINOPS_POLICY_FILE = path.join(ROOT, 'finops-policy.json');
const MISSION_BUDGETS_FILE = path.join(ROOT, 'mission-budgets.json');
const JARVIS_STATE_FILE = path.join(ROOT, 'jarvis-state.json');
const POLICY_FORMAL_FILE = path.join(ROOT, 'policy-formal.json');

const startedAt = Date.now();
let lastRefreshTs = new Date().toISOString();

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, code, obj) {
  withCors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
}

function sendText(res, code, text, contentType = 'text/plain; charset=utf-8') {
  withCors(res);
  res.writeHead(code, { 'Content-Type': contentType });
  res.end(text);
}

function ensureJsonFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

function readJson(file, fallback) {
  try {
    ensureJsonFile(file, fallback);
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  lastRefreshTs = new Date().toISOString();
}

function getRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function normalizeCity(input) {
  return (input || 'Sao Paulo').trim().replace(/\s+/g, '+');
}

function checkTcp(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function getSreMode() {
  const d = readJson(path.join(ROOT, 'sre-mode.json'), { version: 1, mode: 'assist' });
  const mode = String(d?.mode || 'assist').toLowerCase();
  return ['observe', 'assist', 'autopilot'].includes(mode) ? mode : 'assist';
}

function buildMissionPlan(mission, capList) {
  const lower = String(mission || '').toLowerCase();
  const selected = [];

  const pushById = (id, intent) => {
    const c = capList.find((x) => x.id === id) || { id, owner: 'Mike', risk: 'medium', slaMinutes: 60, entrypoint: '' };
    selected.push({
      capabilityId: id,
      intent,
      owner: c.owner || 'Mike',
      risk: c.risk || 'medium',
      slaMinutes: c.slaMinutes || 60,
      entrypoint: c.entrypoint || '',
      rollbackEntrypoint: c.rollbackEntrypoint || ''
    });
  };

  if (/email|remetente|inbox|imap/.test(lower)) pushById('email-monitor.v2', 'Monitorar e reportar e-mails relevantes');
  if (/incident|falha|alerta|outage|recover|recovery/.test(lower)) pushById('incident-recovery.v3', 'Diagnosticar e recuperar incidente');
  if (/ideia|negócio|saas|business/.test(lower)) pushById('business-idea.v1', 'Gerar ideia validada de negócio');
  if (/resumo|executivo|ops|status/.test(lower)) pushById('ops-summary.v1', 'Gerar resumo executivo operacional');
  if (!selected.length) pushById('ops-summary.v1', 'Interpretar objetivo e iniciar plano padrão');

  const missionRisk = selected.some((s) => s.risk === 'high')
    ? 'high'
    : (selected.some((s) => s.risk === 'medium') ? 'medium' : 'low');

  return { mission, missionRisk, plan: selected };
}

const server = http.createServer(async (req, res) => {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  const pathname = url.pathname;

  try {
    // Root: serve dashboard
    if (req.method === 'GET' && pathname === '/') {
      if (!fs.existsSync(DASHBOARD_FILE)) {
        return sendText(res, 404, 'mission-control.html not found in server folder.');
      }
      const html = fs.readFileSync(DASHBOARD_FILE, 'utf8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return sendText(res, 200, html, 'text/html; charset=utf-8');
    }

    // 1) GET /health (simple probe)
    if (req.method === 'GET' && pathname === '/health') {
      const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const jobs = readJson(JOBS_FILE, { jobs: [], runs: [] });
      const alerts = readJson(ALERTS_FILE, []);
      const unsentAlerts = Array.isArray(alerts) ? alerts.filter(a => !a.sent).length : 0;
      return sendJson(res, 200, {
        status: 'ok',
        service: 'mission-control',
        uptime_seconds: uptimeSeconds,
        started_at: new Date(startedAt).toISOString(),
        jobs_count: Array.isArray(jobs?.jobs) ? jobs.jobs.length : 0,
        runs_count: Array.isArray(jobs?.runs) ? jobs.runs.length : 0,
        unsent_alerts: unsentAlerts,
        last_data_refresh: lastRefreshTs,
      });
    }

    // 2) GET /mc/status
    if (req.method === 'GET' && pathname === '/mc/status') {
      const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
      return sendJson(res, 200, {
        connection_health: 'online',
        uptime_seconds: uptimeSeconds,
        started_at: new Date(startedAt).toISOString(),
        last_data_refresh: lastRefreshTs,
      });
    }

    // 2) GET /mc/data
    if (req.method === 'GET' && pathname === '/mc/data') {
      const data = readJson(DATA_FILE, {});
      return sendJson(res, 200, data);
    }

    // 3) POST /mc/data
    if (req.method === 'POST' && pathname === '/mc/data') {
      const raw = await getRequestBody(req);
      const data = raw ? JSON.parse(raw) : {};
      writeJson(DATA_FILE, data);
      return sendJson(res, 200, { ok: true, saved_at: lastRefreshTs });
    }

    // 4) GET /mc/weather?city=[CITY]
    if (req.method === 'GET' && pathname === '/mc/weather') {
      const city = normalizeCity(url.searchParams.get('city'));
      const wttrUrl = `https://wttr.in/${city}?format=j1`;

      const r = await fetch(wttrUrl, { headers: { 'User-Agent': 'MissionControl/1.0' } });
      if (!r.ok) {
        return sendJson(res, 502, { error: 'Failed to fetch weather', status: r.status });
      }

      const payload = await r.json();
      const current = payload?.current_condition?.[0] || {};

      return sendJson(res, 200, {
        city: city.replace(/\+/g, ' '),
        temperature: current.temp_C ? `${current.temp_C}°C` : null,
        condition: current.weatherDesc?.[0]?.value || null,
        feels_like: current.FeelsLikeC ? `${current.FeelsLikeC}°C` : null,
      });
    }

    // 5) GET /mc/activity
    if (req.method === 'GET' && pathname === '/mc/activity') {
      const items = readJson(ACTIVITY_FILE, []);
      const last50 = Array.isArray(items) ? items.slice(-50).reverse() : [];
      return sendJson(res, 200, last50);
    }

    // 6) POST /mc/activity
    if (req.method === 'POST' && pathname === '/mc/activity') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};

      const items = readJson(ACTIVITY_FILE, []);
      const next = Array.isArray(items) ? items : [];
      const entry = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        title: incoming.title || 'Activity',
        message: incoming.message || '',
        meta: incoming.meta || null,
      };

      next.push(entry);
      writeJson(ACTIVITY_FILE, next);

      if (String(entry.message || '').startsWith('ALERTA:')) {
        const alerts = readJson(ALERTS_FILE, []);
        const queue = Array.isArray(alerts) ? alerts : [];
        queue.push({
          id: `alt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          sent: false,
          message: entry.message,
          source: entry.title || 'Mission Control'
        });
        writeJson(ALERTS_FILE, queue);
      }

      return sendJson(res, 200, { ok: true, entry });
    }

    // 7) GET /mc/alerts - unsent exception alerts
    if (req.method === 'GET' && pathname === '/mc/alerts') {
      const alerts = readJson(ALERTS_FILE, []);
      const queue = Array.isArray(alerts) ? alerts : [];
      const unsent = queue.filter(a => !a.sent).slice(-20).reverse();
      return sendJson(res, 200, unsent);
    }

    // 8) POST /mc/alerts/ack - mark alerts as sent
    if (req.method === 'POST' && pathname === '/mc/alerts/ack') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const ids = Array.isArray(incoming.ids) ? incoming.ids : [];

      const alerts = readJson(ALERTS_FILE, []);
      const queue = Array.isArray(alerts) ? alerts : [];
      const idSet = new Set(ids);

      for (const a of queue) {
        if (idSet.has(a.id)) a.sent = true;
      }
      writeJson(ALERTS_FILE, queue);
      return sendJson(res, 200, { ok: true, acked: ids.length });
    }

    // 9) GET /mc/jobs - real job status/runs used by Ops tab
    if (req.method === 'GET' && pathname === '/mc/jobs') {
      const jobs = readJson(JOBS_FILE, { jobs: [], runs: [] });
      return sendJson(res, 200, jobs);
    }

    
    // 10) GET /mc/slo - lightweight SLI/SLO snapshot
    if (req.method === 'GET' && pathname === '/mc/slo') {
      const jobs = readJson(JOBS_FILE, { jobs: [], runs: [] });
      const runs = Array.isArray(jobs?.runs) ? jobs.runs : [];
      const recent = runs.slice(0, 100);
      const failed = recent.filter(r => String(r.status || '').toLowerCase() === 'failed').length;
      const done = recent.filter(r => String(r.status || '').toLowerCase() === 'done').length;
      const successRate = recent.length ? Number(((done / recent.length) * 100).toFixed(1)) : 100;

      const activity = readJson(ACTIVITY_FILE, []);
      const alerts = Array.isArray(activity)
        ? activity.filter(a => String(a.message || '').startsWith('ALERTA:')).slice(-100)
        : [];

      return sendJson(res, 200, {
        generated_at: new Date().toISOString(),
        sli: {
          recent_runs: recent.length,
          success_rate_pct: successRate,
          failed_runs: failed,
          alerts_last_100_events: alerts.length
        },
        slo_targets: {
          success_rate_pct_target: 95,
          alerts_last_100_events_target_max: 5
        },
        slo_status: {
          success_rate: successRate >= 95 ? 'pass' : 'fail',
          alert_noise: alerts.length <= 5 ? 'pass' : 'fail'
        }
      });
    }

    // 11) GET /mc/slo-trends - 7d/30d trend snapshot
    if (req.method === 'GET' && pathname === '/mc/slo-trends') {
      const jobs = readJson(JOBS_FILE, { jobs: [], runs: [] });
      const runs = Array.isArray(jobs?.runs) ? jobs.runs : [];
      const now = Date.now();
      const d7 = now - 7 * 24 * 60 * 60 * 1000;
      const d30 = now - 30 * 24 * 60 * 60 * 1000;

      const parseTs = (r) => {
        const t = Date.parse(String(r?.ts || r?.timestamp || ''));
        return Number.isFinite(t) ? t : null;
      };

      const in7 = runs.filter(r => {
        const t = parseTs(r);
        return t && t >= d7;
      });
      const in30 = runs.filter(r => {
        const t = parseTs(r);
        return t && t >= d30;
      });

      const stats = (arr) => {
        const total = arr.length;
        const done = arr.filter(r => String(r.status || '').toLowerCase() === 'done').length;
        const failed = arr.filter(r => String(r.status || '').toLowerCase() === 'failed').length;
        const running = arr.filter(r => String(r.status || '').toLowerCase() === 'running').length;
        const success = total ? Number(((done / total) * 100).toFixed(1)) : 100;
        return { total, done, failed, running, success_rate_pct: success };
      };

      return sendJson(res, 200, {
        generated_at: new Date().toISOString(),
        window_7d: stats(in7),
        window_30d: stats(in30)
      });
    }

    // 12) GET /mc/runbooks - strategy success ranking
    if (req.method === 'GET' && pathname === '/mc/runbooks') {
      const rb = readJson(RUNBOOKS_FILE, { version: 1, tasks: {} });
      return sendJson(res, 200, rb);
    }

    // 13) GET /mc/mission-runs - latest mission executions
    if (req.method === 'GET' && pathname === '/mc/mission-runs') {
      const mr = readJson(MISSION_RUNS_FILE, { version: 1, runs: [] });
      const runs = Array.isArray(mr?.runs) ? mr.runs.slice(0, 30) : [];
      return sendJson(res, 200, { version: mr?.version || 1, total: runs.length, runs });
    }

    // 14) GET /mc/capabilities - capability registry
    if (req.method === 'GET' && pathname === '/mc/capabilities') {
      const caps = readJson(CAPABILITIES_FILE, { version: 1, capabilities: [] });
      return sendJson(res, 200, caps);
    }

    // 14) POST /mc/mission-plan - objective to executable plan
    if (req.method === 'POST' && pathname === '/mc/mission-plan') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const mission = String(incoming.mission || '').trim();
      if (!mission) return sendJson(res, 400, { error: 'mission is required' });

      const caps = readJson(CAPABILITIES_FILE, { version: 1, capabilities: [] });
      const capList = Array.isArray(caps?.capabilities) ? caps.capabilities : [];
      const built = buildMissionPlan(mission, capList);
      return sendJson(res, 200, {
        generatedAt: new Date().toISOString(),
        mission: built.mission,
        missionRisk: built.missionRisk,
        plan: built.plan,
        nextAction: built.plan[0]?.entrypoint || null
      });
    }

    // 15) POST /mc/mission-execute - plan -> execute -> rollback -> audit payload
    if (req.method === 'POST' && pathname === '/mc/mission-execute') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const mission = String(incoming.mission || '').trim();
      if (!mission) return sendJson(res, 400, { error: 'mission is required' });

      const dryRun = Boolean(incoming.dryRun);
      const requestedBy = String(incoming.requestedBy || 'Mike');
      const timeoutSec = Math.max(30, Math.min(900, Number(incoming.timeoutSec || 240)));

      const caps = readJson(CAPABILITIES_FILE, { version: 1, capabilities: [] });
      const capList = Array.isArray(caps?.capabilities) ? caps.capabilities : [];
      const built = (Array.isArray(incoming.plan) && incoming.plan.length)
        ? {
            mission,
            missionRisk: String(incoming.missionRisk || 'medium'),
            plan: incoming.plan
          }
        : buildMissionPlan(mission, capList);

      const finopsProc = spawnSync('/root/.openclaw/workspace/scripts/finops-route.sh', [mission, built.missionRisk, String(incoming.budgetUsd || '')], {
        encoding: 'utf8', timeout: 30000
      });
      const finopsVals = {};
      String(finopsProc.stdout || '').split(/\r?\n/).forEach((ln) => {
        const i = ln.indexOf('=');
        if (i > 0) finopsVals[ln.slice(0, i)] = ln.slice(i + 1);
      });

      const run = {
        id: `mission_${Date.now()}`,
        mission,
        missionRisk: built.missionRisk,
        requestedBy,
        dryRun,
        startedAt: new Date().toISOString(),
        endedAt: null,
        status: 'running',
        finops: {
          model: finopsVals.FINOPS_MODEL || null,
          action: finopsVals.FINOPS_ACTION || 'keep',
          reason: finopsVals.FINOPS_REASON || 'n/a',
          budgetUsd: Number(finopsVals.FINOPS_BUDGET_USD || 0),
          estimatedTokens: Number(finopsVals.FINOPS_EST_TOKENS || 0),
          estimatedCostUsd: Number(finopsVals.FINOPS_EST_COST_USD || 0)
        },
        sla: { total: built.plan.length, breaches: 0, met: 0 },
        steps: [],
        rollback: []
      };

      const completed = [];

      for (const step of built.plan) {
        const startedAt = new Date();
        const capabilityId = String(step.capabilityId || 'unknown');
        const cap = capList.find((x) => x.id === capabilityId) || {};
        const entrypoint = String(step.entrypoint || cap.entrypoint || '').trim();
        const rollbackEntrypoint = String(step.rollbackEntrypoint || cap.rollbackEntrypoint || '').trim();
        const slaMinutes = Number(step.slaMinutes || cap.slaMinutes || 60);

        let ok = false;
        let note = '';

        if (dryRun) {
          ok = true;
          note = `dry_run: ${entrypoint || 'no entrypoint'}`;
        } else if (!entrypoint) {
          ok = false;
          note = 'missing entrypoint';
        } else {
          const execRes = spawnSync('/bin/sh', ['-lc', `cd ${ROOT} && ${entrypoint}`], {
            encoding: 'utf8',
            timeout: timeoutSec * 1000,
            maxBuffer: 1024 * 1024
          });
          ok = execRes.status === 0;
          note = String(execRes.stdout || execRes.stderr || '').trim().slice(0, 500);
          if (execRes.error) note = String(execRes.error.message || note || 'execution error').slice(0, 500);
        }

        const endedAt = new Date();
        const durationSec = Number(((endedAt.getTime() - startedAt.getTime()) / 1000).toFixed(2));
        const slaOk = durationSec <= (slaMinutes * 60);
        if (slaOk) run.sla.met += 1;
        else run.sla.breaches += 1;

        run.steps.push({
          capabilityId,
          owner: step.owner || cap.owner || 'Mike',
          risk: step.risk || cap.risk || 'medium',
          intent: step.intent || '',
          entrypoint,
          rollbackEntrypoint,
          slaMinutes,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSec,
          slaOk,
          ok,
          note
        });

        if (!ok) {
          run.status = 'failed';

          for (const prev of completed.reverse()) {
            if (!prev.rollbackEntrypoint) {
              run.rollback.push({ capabilityId: prev.capabilityId, attempted: false, ok: false, note: 'rollback entrypoint not set' });
              continue;
            }

            if (dryRun) {
              run.rollback.push({ capabilityId: prev.capabilityId, attempted: true, ok: true, note: `dry_run: ${prev.rollbackEntrypoint}` });
              continue;
            }

            const rb = spawnSync('/bin/sh', ['-lc', `cd ${ROOT} && ${prev.rollbackEntrypoint}`], {
              encoding: 'utf8',
              timeout: timeoutSec * 1000,
              maxBuffer: 1024 * 1024
            });
            run.rollback.push({
              capabilityId: prev.capabilityId,
              attempted: true,
              ok: rb.status === 0,
              note: String(rb.stdout || rb.stderr || '').trim().slice(0, 300)
            });
          }
          break;
        }

        completed.push({ capabilityId, rollbackEntrypoint });
      }

      if (run.status === 'running') run.status = 'done';
      run.endedAt = new Date().toISOString();

      const mr = readJson(MISSION_RUNS_FILE, { version: 1, runs: [] });
      mr.runs = Array.isArray(mr.runs) ? mr.runs : [];
      mr.runs.unshift(run);
      mr.runs = mr.runs.slice(0, 200);
      writeJson(MISSION_RUNS_FILE, mr);

      const ledger = readJson(MISSION_BUDGETS_FILE, { version: 1, items: [] });
      ledger.items = Array.isArray(ledger.items) ? ledger.items : [];
      ledger.items.unshift({
        id: run.id,
        mission: run.mission,
        risk: run.missionRisk,
        ts: run.endedAt,
        model: run.finops?.model || null,
        action: run.finops?.action || 'keep',
        estimatedTokens: Number(run.finops?.estimatedTokens || 0),
        estimatedCostUsd: Number(run.finops?.estimatedCostUsd || 0),
        budgetUsd: Number(run.finops?.budgetUsd || 0),
        status: run.status
      });
      ledger.items = ledger.items.slice(0, 500);
      writeJson(MISSION_BUDGETS_FILE, ledger);

      return sendJson(res, 200, run);
    }

    // 15) GET /mc/jarvis/state - canonical event+snpashot state
    if (req.method === 'GET' && pathname === '/mc/jarvis/state') {
      const st = readJson(JARVIS_STATE_FILE, { version: 1, events: [], snapshots: [] });
      return sendJson(res, 200, {
        version: st?.version || 1,
        events: Array.isArray(st?.events) ? st.events.slice(-100) : [],
        snapshots: Array.isArray(st?.snapshots) ? st.snapshots.slice(0, 20) : []
      });
    }

    // 16) POST /mc/jarvis/event - append event to canonical store
    if (req.method === 'POST' && pathname === '/mc/jarvis/event') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const type = String(incoming.type || 'event');
      const entity = String(incoming.entity || 'system');
      const payload = JSON.stringify(incoming.payload || {});
      const x = spawnSync('/root/.openclaw/workspace/scripts/state-event.sh', [type, entity, payload], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { ok: false, output: txt.slice(0, 500) });
    }

    // 17) POST /mc/planner/competitive - multi-planner proposals
    if (req.method === 'POST' && pathname === '/mc/planner/competitive') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const mission = String(incoming.mission || '').trim();
      if (!mission) return sendJson(res, 400, { error: 'mission is required' });
      const risk = String(incoming.risk || 'medium');
      const budget = String(incoming.budgetUsd != null ? incoming.budgetUsd : 0.8);
      const x = spawnSync('/root/.openclaw/workspace/scripts/planner-competitive.sh', [mission, risk, budget], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { error: 'planner failed', output: txt.slice(0, 500) });
    }

    // 18) POST /mc/planner/arbitrate - deterministic arbiter over planners
    if (req.method === 'POST' && pathname === '/mc/planner/arbitrate') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const mission = String(incoming.mission || '').trim();
      if (!mission) return sendJson(res, 400, { error: 'mission is required' });
      const risk = String(incoming.risk || 'medium');
      const budget = String(incoming.budgetUsd != null ? incoming.budgetUsd : 0.8);
      const x = spawnSync('/root/.openclaw/workspace/scripts/planner-arbiter.sh', [mission, risk, budget], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { error: 'arbiter failed', output: txt.slice(0, 500) });
    }

    // 19) POST /mc/autonomy/evaluate - compute target mode from confidence stats
    if (req.method === 'POST' && pathname === '/mc/autonomy/evaluate') {
      const x = spawnSync('/root/.openclaw/workspace/scripts/autonomy-mode-eval.sh', [], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { error: 'autonomy eval failed', output: txt.slice(0, 500) });
    }

    // 20) POST /mc/autonomy/apply - evaluate and apply SRE mode automatically
    if (req.method === 'POST' && pathname === '/mc/autonomy/apply') {
      const x = spawnSync('/root/.openclaw/workspace/scripts/autonomy-mode-eval.sh', [], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      if (!parsed?.mode) return sendJson(res, 500, { error: 'invalid autonomy eval', output: txt.slice(0, 500) });

      const modePath = path.join(ROOT, 'sre-mode.json');
      const curr = readJson(modePath, { version: 1, mode: 'assist' });
      const prev = curr.mode || 'assist';
      curr.mode = parsed.mode;
      curr.updatedAt = new Date().toISOString();
      curr.reason = parsed.reason || 'autonomy_apply';
      writeJson(modePath, curr);

      spawnSync('/root/.openclaw/workspace/scripts/state-event.sh', ['autonomy_mode', 'sre-mode', JSON.stringify({ from: prev, to: curr.mode, reason: curr.reason })], { encoding: 'utf8', timeout: 30000 });

      return sendJson(res, 200, { ok: true, from: prev, to: curr.mode, reason: curr.reason, stats: parsed.stats || {} });
    }

    // 21) POST /mc/regression/gate - block promotion on regression failure
    if (req.method === 'POST' && pathname === '/mc/regression/gate') {
      const x = spawnSync('/root/.openclaw/workspace/scripts/regression-gate.sh', [], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { gate: 'fail', output: txt.slice(0, 500) });
    }

    // 18) POST /mc/policy-formal/eval - formal policy decision
    if (req.method === 'POST' && pathname === '/mc/policy-formal/eval') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const x = spawnSync('/root/.openclaw/workspace/scripts/policy-formal-eval.sh', [JSON.stringify(incoming || {})], { encoding: 'utf8', timeout: 30000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 403, parsed || { allow: false, output: txt.slice(0, 500) });
    }

    // 19) POST /mc/policy-formal/test - formal policy unit tests
    if (req.method === 'POST' && pathname === '/mc/policy-formal/test') {
      const x = spawnSync('/root/.openclaw/workspace/scripts/policy-formal-test.sh', [], { encoding: 'utf8', timeout: 60000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { gate: 'fail', output: txt.slice(0, 500) });
    }

    // 20) POST /mc/regression/run - mission regression suite
    if (req.method === 'POST' && pathname === '/mc/regression/run') {
      const x = spawnSync('/root/.openclaw/workspace/scripts/regression-suite.sh', [], { encoding: 'utf8', timeout: 300000 });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { gate: 'fail', output: txt.slice(0, 500) });
    }

    // 21) POST /mc/contracts/validate - validate plan DSL against contracts
    if (req.method === 'POST' && pathname === '/mc/contracts/validate') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const payload = JSON.stringify({ steps: Array.isArray(incoming.steps) ? incoming.steps : [] });
      const v = spawnSync('/root/.openclaw/workspace/scripts/contracts-validate.sh', [payload], { encoding: 'utf8', timeout: 30000 });
      const txt = String(v.stdout || v.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, v.status === 0 ? 200 : 400, parsed || { ok: false, output: txt.slice(0, 500) });
    }

    // 16) POST /mc/mission/verify - verifier gate
    if (req.method === 'POST' && pathname === '/mc/mission/verify') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const payload = JSON.stringify({
        missionRisk: String(incoming.missionRisk || 'medium'),
        steps: Array.isArray(incoming.steps) ? incoming.steps : []
      });
      const v = spawnSync('/root/.openclaw/workspace/scripts/mission-verifier.sh', [payload], { encoding: 'utf8', timeout: 30000 });
      const txt = String(v.stdout || v.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, v.status === 0 ? 200 : 400, parsed || { ok: false, output: txt.slice(0, 500) });
    }

    // 17) POST /mc/mission/execute-dsl - deterministic DSL executor
    if (req.method === 'POST' && pathname === '/mc/mission/execute-dsl') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const payload = JSON.stringify({ steps: Array.isArray(incoming.steps) ? incoming.steps : [] });

      const verify = spawnSync('/root/.openclaw/workspace/scripts/mission-verifier.sh', [JSON.stringify({ missionRisk: String(incoming.missionRisk || 'medium'), steps: incoming.steps || [] })], {
        encoding: 'utf8', timeout: 30000
      });
      if (verify.status !== 0) {
        const t = String(verify.stdout || verify.stderr || '').trim();
        let p = null;
        try { p = JSON.parse(t.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
        return sendJson(res, 400, p || { ok: false, error: 'verifier blocked', output: t.slice(0, 500) });
      }

      const x = spawnSync('/root/.openclaw/workspace/scripts/mission-dsl-exec.sh', [payload, String(incoming.timeoutSec || 240)], {
        encoding: 'utf8', timeout: 300000
      });
      const txt = String(x.stdout || x.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, x.status === 0 ? 200 : 500, parsed || { ok: false, output: txt.slice(0, 500) });
    }

    // 18) GET /mc/shadow-score - model shadow ranking
    if (req.method === 'GET' && pathname === '/mc/shadow-score') {
      const s = spawnSync('/root/.openclaw/workspace/scripts/shadow-score.sh', [], { encoding: 'utf8', timeout: 30000 });
      const txt = String(s.stdout || s.stderr || '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}'); } catch {}
      return sendJson(res, s.status === 0 ? 200 : 500, parsed || { error: 'shadow score failed', output: txt.slice(0, 500) });
    }

    // 19) GET /mc/finops - autonomous FinOps summary
    if (req.method === 'GET' && pathname === '/mc/finops') {
      const policy = readJson(FINOPS_POLICY_FILE, { version: 1, defaults: { missionBudgetUsd: 0.8 }, modelCostsUsdPer1k: {} });
      const ledger = readJson(MISSION_BUDGETS_FILE, { version: 1, items: [] });
      const items = Array.isArray(ledger?.items) ? ledger.items : [];
      const totalSpent = items.reduce((acc, x) => acc + Number(x?.estimatedCostUsd || 0), 0);
      const totalMissions = items.length;
      const avgPerMission = totalMissions ? Number((totalSpent / totalMissions).toFixed(4)) : 0;
      return sendJson(res, 200, {
        generatedAt: new Date().toISOString(),
        defaultBudgetUsd: Number(policy?.defaults?.missionBudgetUsd || 0.8),
        totalMissions,
        totalEstimatedSpendUsd: Number(totalSpent.toFixed(4)),
        avgEstimatedSpendUsd: avgPerMission,
        recent: items.slice(0, 20)
      });
    }

    // 16) POST /mc/finops/route - cost+latency+quality route decision
    if (req.method === 'POST' && pathname === '/mc/finops/route') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const mission = String(incoming.mission || '').trim();
      if (!mission) return sendJson(res, 400, { error: 'mission is required' });
      const risk = String(incoming.risk || 'medium').toLowerCase();
      const budget = incoming.budgetUsd != null ? String(incoming.budgetUsd) : '';

      const f = spawnSync('/root/.openclaw/workspace/scripts/finops-route.sh', [mission, risk, budget], { encoding: 'utf8', timeout: 30000 });
      if (f.status !== 0) return sendJson(res, 500, { error: 'finops route failed', output: String(f.stderr || f.stdout || '').trim().slice(0, 500) });

      const out = String(f.stdout || '');
      const vals = {};
      out.split(/\r?\n/).forEach((ln) => {
        const i = ln.indexOf('=');
        if (i > 0) vals[ln.slice(0, i)] = ln.slice(i + 1);
      });
      return sendJson(res, 200, {
        mission,
        risk,
        model: vals.FINOPS_MODEL || null,
        action: vals.FINOPS_ACTION || 'keep',
        reason: vals.FINOPS_REASON || 'n/a',
        budgetUsd: Number(vals.FINOPS_BUDGET_USD || 0),
        estimatedTokens: Number(vals.FINOPS_EST_TOKENS || 0),
        estimatedCostUsd: Number(vals.FINOPS_EST_COST_USD || 0)
      });
    }

    // 17) GET /mc/control-tower - executive control state
    if (req.method === 'GET' && pathname === '/mc/control-tower') {
      const mode = getSreMode();
      const mr = readJson(MISSION_RUNS_FILE, { version: 1, runs: [] });
      const runs = Array.isArray(mr?.runs) ? mr.runs : [];
      const latestMission = runs[0] || null;
      const marker = fs.existsSync(path.join(ROOT, '.promotion-green'));
      return sendJson(res, 200, {
        mode,
        promotionGreen: marker,
        latestMission
      });
    }

    // 16) POST /mc/control-tower/mode - observe|assist|autopilot
    if (req.method === 'POST' && pathname === '/mc/control-tower/mode') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const mode = String(incoming.mode || '').toLowerCase();
      if (!['observe', 'assist', 'autopilot'].includes(mode)) return sendJson(res, 400, { error: 'invalid mode' });

      const modePath = path.join(ROOT, 'sre-mode.json');
      const curr = readJson(modePath, { version: 1, mode: 'assist' });
      curr.mode = mode;
      curr.updatedAt = new Date().toISOString();
      writeJson(modePath, curr);
      return sendJson(res, 200, { ok: true, mode });
    }

    // 17) POST /mc/control-tower/promote - promote-if-green
    if (req.method === 'POST' && pathname === '/mc/control-tower/promote') {
      const p = spawnSync('/root/.openclaw/workspace/scripts/promote-if-green.sh', [], { encoding: 'utf8', timeout: 60000 });
      const ok = p.status === 0;
      return sendJson(res, ok ? 200 : 409, {
        ok,
        status: ok ? 'promoted' : 'blocked',
        output: String(p.stdout || p.stderr || '').trim().slice(0, 500)
      });
    }

    // 18) POST /mc/control-tower/rollback - revoke green promotion marker
    if (req.method === 'POST' && pathname === '/mc/control-tower/rollback') {
      const marker = path.join(ROOT, '.promotion-green');
      const existed = fs.existsSync(marker);
      if (existed) fs.unlinkSync(marker);
      return sendJson(res, 200, { ok: true, revoked: existed, marker: '.promotion-green' });
    }

    // 19) POST /mc/control-tower/mission - deprecated proxy (use /mc/mission-execute directly)
    if (req.method === 'POST' && pathname === '/mc/control-tower/mission') {
      return sendJson(res, 501, { error: 'use /mc/mission-execute directly' });
    }

    // 20) GET /mc/replays - replay library
    if (req.method === 'GET' && pathname === '/mc/replays') {
      const lib = readJson(REPLAY_LIBRARY_FILE, { version: 1, scenarios: [] });
      const scenarios = Array.isArray(lib?.scenarios) ? lib.scenarios : [];
      return sendJson(res, 200, { version: lib?.version || 1, total: scenarios.length, scenarios });
    }

    // 16) POST /mc/replays/run - execute one replay scenario in digital twin mode
    if (req.method === 'POST' && pathname === '/mc/replays/run') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const id = String(incoming.id || '').trim();
      if (!id) return sendJson(res, 400, { error: 'id is required' });

      const dryRun = incoming.dryRun !== false;
      const captureTwin = incoming.captureTwin !== false;

      if (captureTwin) {
        spawnSync('/root/.openclaw/workspace/scripts/twin-capture.sh', ['before-replay'], { encoding: 'utf8', timeout: 30000 });
      }

      const rr = spawnSync('/root/.openclaw/workspace/scripts/replay-run.sh', [id, dryRun ? '1' : '0'], {
        encoding: 'utf8',
        timeout: 240000
      });

      const output = String(rr.stdout || rr.stderr || '').trim();
      let parsed = null;
      try {
        parsed = JSON.parse(output.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '{}');
      } catch {}

      const runs = readJson(REPLAY_RUNS_FILE, { version: 1, runs: [] });
      runs.runs = Array.isArray(runs.runs) ? runs.runs : [];
      runs.runs.unshift(parsed || {
        id: `replay_${Date.now()}`,
        scenarioId: id,
        status: rr.status === 0 ? 'done' : 'failed',
        note: output.slice(-500),
        ts: new Date().toISOString()
      });
      runs.runs = runs.runs.slice(0, 200);
      writeJson(REPLAY_RUNS_FILE, runs);

      if (captureTwin) {
        spawnSync('/root/.openclaw/workspace/scripts/twin-capture.sh', ['after-replay'], { encoding: 'utf8', timeout: 30000 });
      }

      return sendJson(res, rr.status === 0 ? 200 : 500, parsed || { ok: rr.status === 0, output });
    }

    // 17) GET /mc/twin - current digital twin snapshot metadata
    if (req.method === 'GET' && pathname === '/mc/twin') {
      const twin = readJson(TWIN_STATE_FILE, { version: 1, snapshots: [] });
      const snaps = Array.isArray(twin?.snapshots) ? twin.snapshots : [];
      return sendJson(res, 200, {
        version: twin?.version || 1,
        total: snaps.length,
        latest: snaps[0] || null,
        snapshots: snaps.slice(0, 20)
      });
    }

    // 18) GET /mc/compliance - policy/eval compliance snapshot
    if (req.method === 'GET' && pathname === '/mc/compliance') {
      const evalReport = readJson(path.join(ROOT, 'eval', 'latest-report.json'), { gate: 'unknown', score: 0 });
      const auditPath = path.join(ROOT, 'audit-log.jsonl');
      let policyBlocks24h = 0;
      let totalAudit24h = 0;
      let topPolicyRule = 'none';
      const now = Date.now();
      const d24 = now - 24 * 60 * 60 * 1000;
      const ruleCount = {};
      try {
        if (fs.existsSync(auditPath)) {
          const lines = fs.readFileSync(auditPath, 'utf8').split(/\r?\n/).filter(Boolean);
          for (const ln of lines) {
            try {
              const e = JSON.parse(ln);
              const t = Date.parse(String(e.ts || ''));
              if (!Number.isFinite(t) || t < d24) continue;
              totalAudit24h += 1;
              if (String(e.type || '') === 'policy_block') {
                policyBlocks24h += 1;
                const r = String(e.notes || 'policy_block');
                ruleCount[r] = (ruleCount[r] || 0) + 1;
              }
            } catch {}
          }
        }
      } catch {}
      const top = Object.entries(ruleCount).sort((a,b) => b[1]-a[1])[0];
      if (top) topPolicyRule = top[0];

      return sendJson(res, 200, {
        generated_at: new Date().toISOString(),
        eval_gate: evalReport?.gate || 'unknown',
        eval_score: evalReport?.score ?? 0,
        policy_blocks_24h: policyBlocks24h,
        total_audit_events_24h: totalAudit24h,
        top_policy_rule: topPolicyRule,
        compliance_status: (String(evalReport?.gate || '') === 'pass' && policyBlocks24h === 0) ? 'green' : 'attention'
      });
    }

    // 14) GET /mc/incidents - state machine snapshot
    if (req.method === 'GET' && pathname === '/mc/incidents') {
      const st = readJson(INCIDENT_STATE_FILE, { version: 1, incidents: {} });
      const incidentsMap = st?.incidents && typeof st.incidents === 'object' ? st.incidents : {};
      const list = Object.values(incidentsMap)
        .sort((a, b) => Date.parse(String(b?.updatedAt || 0)) - Date.parse(String(a?.updatedAt || 0)))
        .slice(0, 50);
      return sendJson(res, 200, { version: st?.version || 1, total: list.length, incidents: list });
    }

    // 14) GET /mc/health-score - single executive score (0-100)
    if (req.method === 'GET' && pathname === '/mc/health-score') {
      const jobs = readJson(JOBS_FILE, { jobs: [], runs: [] });
      const pms = readJson(POSTMORTEMS_FILE, []);
      const runs = Array.isArray(jobs?.runs) ? jobs.runs.slice(0, 100) : [];
      const jobList = Array.isArray(jobs?.jobs) ? jobs.jobs : [];
      const openPm = Array.isArray(pms) ? pms.filter(x => String(x.status || '').toLowerCase() === 'open').length : 0;
      const failedJobs = jobList.filter(j => String(j.status || '').toLowerCase() === 'failed').length;
      const doneRuns = runs.filter(r => String(r.status || '').toLowerCase() === 'done').length;
      const runSuccess = runs.length ? (doneRuns / runs.length) * 100 : 100;

      let score = 100;
      score -= Math.min(40, openPm * 12);
      score -= Math.min(25, failedJobs * 10);
      score -= Math.max(0, Math.round((95 - runSuccess) * 0.8));
      score = Math.max(0, Math.min(100, Math.round(score)));

      const level = score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical';

      return sendJson(res, 200, {
        generated_at: new Date().toISOString(),
        score,
        level,
        factors: {
          open_postmortems: openPm,
          failed_jobs: failedJobs,
          run_success_rate_pct: Number(runSuccess.toFixed(1)),
          recent_runs: runs.length
        }
      });
    }

    // 14) POST /mc/high-risk/approve - manual approval for high-risk auto-heal
    if (req.method === 'POST' && pathname === '/mc/high-risk/approve') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const id = String(incoming.id || '').trim();
      if (!id) return sendJson(res, 400, { error: 'id is required' });

      const items = readJson(POSTMORTEMS_FILE, []);
      const list = Array.isArray(items) ? items : [];
      const pm = list.find(x => x.id === id);
      if (!pm) return sendJson(res, 404, { error: 'postmortem not found' });

      if (String(pm.status || '').toLowerCase() !== 'open') {
        return sendJson(res, 200, { ok: true, message: 'already closed', postmortem: pm });
      }

      const incident = String(pm.incident || '');
      spawnSync('/root/.openclaw/workspace/scripts/incident-state.sh', ['transition', id, 'approved', 'manual high-risk approval'], { encoding: 'utf8', timeout: 30000 });

      const heal = spawnSync('/root/.openclaw/workspace/scripts/auto-heal.sh', [incident, id], {
        encoding: 'utf8',
        timeout: 240000
      });

      const out = String(heal.stdout || '');
      const kv = {};
      out.split(/\r?\n/).forEach(line => {
        const i = line.indexOf('=');
        if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });

      const healed = kv.AUTOHEAL_RESULT === 'healed';
      const notes = kv.AUTOHEAL_NOTES || 'sem retorno do auto-heal';
      const level = kv.AUTOHEAL_LEVEL || '3';
      const nowIso = new Date().toISOString();

      if (healed) {
        pm.status = 'closed';
        pm.action_taken = `${pm.action_taken || ''} | approved_by_human:${nowIso} | level=${level} | ${notes}`.trim();
        spawnSync('/root/.openclaw/workspace/scripts/incident-state.sh', ['transition', id, 'healed', notes], { encoding: 'utf8', timeout: 30000 });
        spawnSync('/root/.openclaw/workspace/scripts/incident-state.sh', ['transition', id, 'closed', 'manual approval closed'], { encoding: 'utf8', timeout: 30000 });
      } else {
        pm.action_taken = `${pm.action_taken || ''} | approval_attempt:${nowIso} | level=${level} | ${notes}`.trim();
        spawnSync('/root/.openclaw/workspace/scripts/incident-state.sh', ['transition', id, 'escalated', notes], { encoding: 'utf8', timeout: 30000 });
      }

      writeJson(POSTMORTEMS_FILE, list);

      const activity = readJson(ACTIVITY_FILE, []);
      const a = Array.isArray(activity) ? activity : [];
      a.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        title: 'High Risk Approval',
        message: healed ? `Aprovação manual aplicada: ${incident}` : `Aprovação manual sem cura: ${incident}`,
        meta: { postmortemId: id, healed, notes, level }
      });
      writeJson(ACTIVITY_FILE, a);

      return sendJson(res, 200, { ok: true, healed, level, notes, postmortem: pm });
    }

    // 14) GET/POST /mc/postmortems
    if (req.method === 'GET' && pathname === '/mc/postmortems') {
      const items = readJson(POSTMORTEMS_FILE, []);
      const list = Array.isArray(items) ? items.slice(-50).reverse() : [];
      return sendJson(res, 200, list);
    }

    if (req.method === 'POST' && pathname === '/mc/postmortems') {
      const raw = await getRequestBody(req);
      const incoming = raw ? JSON.parse(raw) : {};
      const items = readJson(POSTMORTEMS_FILE, []);
      const list = Array.isArray(items) ? items : [];

      const entry = {
        id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
        incident: incoming.incident || 'Incidente não especificado',
        probable_cause: incoming.probable_cause || 'A investigar',
        action_taken: incoming.action_taken || 'Sem ação registrada',
        prevention: incoming.prevention || 'Definir prevenção',
        status: incoming.status || 'open'
      };
      list.push(entry);
      writeJson(POSTMORTEMS_FILE, list);
      return sendJson(res, 200, { ok: true, entry });
    }

    // 12) GET /mc/otserver - lightweight OTServer health

    if (req.method === 'GET' && pathname === '/mc/otserver') {
      const host = (url.searchParams.get('host') || '127.0.0.1').trim();
      const gamePort = Number(url.searchParams.get('gamePort') || 7171);
      const loginPort = Number(url.searchParams.get('loginPort') || 7172);

      const [gameOk, loginOk] = await Promise.all([
        checkTcp(host, gamePort),
        checkTcp(host, loginPort),
      ]);

      const overall = gameOk && loginOk ? 'online' : (gameOk || loginOk ? 'degraded' : 'offline');

      return sendJson(res, 200, {
        host,
        checked_at: new Date().toISOString(),
        overall,
        ports: {
          [gamePort]: gameOk ? 'open' : 'closed',
          [loginPort]: loginOk ? 'open' : 'closed'
        }
      });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
});

// Boot files
ensureJsonFile(DATA_FILE, {});
ensureJsonFile(ACTIVITY_FILE, []);
ensureJsonFile(ALERTS_FILE, []);
ensureJsonFile(JOBS_FILE, { jobs: [], runs: [] });
ensureJsonFile(POSTMORTEMS_FILE, []);
ensureJsonFile(RUNBOOKS_FILE, { version: 1, tasks: {} });
ensureJsonFile(INCIDENT_STATE_FILE, { version: 1, incidents: {} });
ensureJsonFile(CAPABILITIES_FILE, { version: 1, capabilities: [] });
ensureJsonFile(MISSION_RUNS_FILE, { version: 1, runs: [] });
ensureJsonFile(REPLAY_LIBRARY_FILE, { version: 1, scenarios: [] });
ensureJsonFile(TWIN_STATE_FILE, { version: 1, snapshots: [] });
ensureJsonFile(REPLAY_RUNS_FILE, { version: 1, runs: [] });
ensureJsonFile(FINOPS_POLICY_FILE, { version: 1, defaults: { missionBudgetUsd: 0.8 }, modelCostsUsdPer1k: {} });
ensureJsonFile(MISSION_BUDGETS_FILE, { version: 1, items: [] });
ensureJsonFile(JARVIS_STATE_FILE, { version: 1, events: [], snapshots: [] });
ensureJsonFile(POLICY_FORMAL_FILE, { version: 1, rules: [], default: { effect: 'allow', reason: 'default' } });

server.listen(PORT, HOST, () => {
  console.log(`Mission Control server running at http://${HOST}:${PORT}`);
  console.log(`Serving: ${DASHBOARD_FILE}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Activity file: ${ACTIVITY_FILE}`);
});
