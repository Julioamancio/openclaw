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

    // 13) GET /mc/incidents - state machine snapshot
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

server.listen(PORT, HOST, () => {
  console.log(`Mission Control server running at http://${HOST}:${PORT}`);
  console.log(`Serving: ${DASHBOARD_FILE}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Activity file: ${ACTIVITY_FILE}`);
});
