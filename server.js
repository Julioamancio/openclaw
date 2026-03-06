#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { URL } = require('url');

const PORT = 8899;
const HOST = '0.0.0.0';

const ROOT = __dirname;
const DASHBOARD_FILE = path.join(ROOT, 'mission-control.html');
const DATA_FILE = path.join(ROOT, 'mc-data.json');
const ACTIVITY_FILE = path.join(ROOT, 'mc-activity.json');
const ALERTS_FILE = path.join(ROOT, 'mc-alerts.json');
const JOBS_FILE = path.join(ROOT, 'mc-jobs.json');

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

    // 1) GET /mc/status
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

    // 10) GET /mc/otserver - lightweight OTServer health
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

server.listen(PORT, HOST, () => {
  console.log(`Mission Control server running at http://${HOST}:${PORT}`);
  console.log(`Serving: ${DASHBOARD_FILE}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Activity file: ${ACTIVITY_FILE}`);
});
