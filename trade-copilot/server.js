const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '0.0.0.0';
const PORT = process.env.PORT ? Number(process.env.PORT) : 8090;
const WEB_DIR = path.join(__dirname, 'web');
const LOG_DIR = path.join(__dirname, 'data');
const TRADES_LOG = path.join(LOG_DIR, 'paper-trades.jsonl');
const AUTO_STATE_FILE = path.join(LOG_DIR, 'auto-state.json');
const AUTO_BOT_LOG = path.join(LOG_DIR, 'auto-bot.log');
const AUTO_SUP_LOG = path.join(LOG_DIR, 'auto-supervisor.log');
const BOT_MODE_FILE = path.join(LOG_DIR, 'bot-mode.json');
const BRAND_FILE = path.join(LOG_DIR, 'brand.json');
const ENV_PATH = '/root/.openclaw/workspace/.env.trading';
const LEGACY_ENV_PATH = path.join(__dirname, '.env');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function parseEnvFile(file, out) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
}

function loadEnv() {
  const out = {};
  parseEnvFile(LEGACY_ENV_PATH, out);
  parseEnvFile(ENV_PATH, out);
  return out;
}

let ENV = loadEnv();
let BINANCE_BASE_URL = ENV.BINANCE_BASE_URL || 'https://api.binance.com';
let BINANCE_API_KEY = ENV.BINANCE_API_KEY || '';
let BINANCE_API_SECRET = ENV.BINANCE_API_SECRET || '';
let BINANCE_MODE = ENV.BINANCE_MODE || 'paper';

function writeEnv(obj) {
  const lines = Object.entries(obj).map(([k, v]) => `${k}=${v ?? ''}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
}

function reloadEnv() {
  ENV = loadEnv();
  BINANCE_BASE_URL = ENV.BINANCE_BASE_URL || 'https://api.binance.com';
  BINANCE_API_KEY = ENV.BINANCE_API_KEY || '';
  BINANCE_API_SECRET = ENV.BINANCE_API_SECRET || '';
  BINANCE_MODE = ENV.BINANCE_MODE || 'paper';
}


function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

async function binancePublic(pathname, query = '') {
  const url = `${BINANCE_BASE_URL}${pathname}${query ? `?${query}` : ''}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'trade-copilot/1.2' } });
  if (!r.ok) throw new Error(`Binance ${r.status}`);
  return r.json();
}

async function binanceSigned(method, pathname, params = {}) {
  if (!BINANCE_API_KEY || !BINANCE_API_SECRET) throw new Error('Missing Binance API credentials');

  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qp.append(k, String(v));
  });
  qp.append('timestamp', String(Date.now()));
  qp.append('recvWindow', '5000');

  const query = qp.toString();
  const signature = crypto.createHmac('sha256', BINANCE_API_SECRET).update(query).digest('hex');
  const fullQuery = `${query}&signature=${signature}`;
  const url = `${BINANCE_BASE_URL}${pathname}?${fullQuery}`;

  const r = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': BINANCE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'trade-copilot/1.2'
    }
  });

  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
  if (!r.ok) throw new Error(data.msg || `Binance ${r.status}`);
  return data;
}

function ema(values, period) {
  const k = 2 / (period + 1);
  let out = values[0];
  for (let i = 1; i < values.length; i++) out = values[i] * k + out * (1 - k);
  return out;
}

function atr(klines, period = 14) {
  const trs = [];
  for (let i = 1; i < klines.length; i++) {
    const high = Number(klines[i][2]);
    const low = Number(klines[i][3]);
    const prevClose = Number(klines[i - 1][4]);
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  if (!trs.length) return 0;
  if (trs.length < period) return trs[trs.length - 1];
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function rsi(values, period = 14) {
  if (values.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - (100 / (1 + rs));
}

function vwap(klines) {
  let pv = 0, v = 0;
  for (const k of klines) {
    const high = Number(k[2]);
    const low = Number(k[3]);
    const close = Number(k[4]);
    const vol = Number(k[5]);
    const tp = (high + low + close) / 3;
    pv += tp * vol;
    v += vol;
  }
  return v ? pv / v : 0;
}

function bollinger(values, period = 20, mult = 2) {
  if (values.length < period) return { mid: values[values.length - 1], upper: values[values.length - 1], lower: values[values.length - 1] };
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { mid: mean, upper: mean + mult * std, lower: mean - mult * std };
}

function macd(values, fast = 12, slow = 26, signal = 9) {
  if (values.length < slow + signal) return { macd: 0, signal: 0, hist: 0 };
  const macdSeries = values.map((_, i) => {
    const slice = values.slice(0, i + 1);
    const eFast = ema(slice, fast);
    const eSlow = ema(slice, slow);
    return eFast - eSlow;
  });
  const macdLine = macdSeries[macdSeries.length - 1];
  const signalLine = ema(macdSeries.slice(-signal - 5), signal);
  return { macd: macdLine, signal: signalLine, hist: macdLine - signalLine };
}

function number(v, d = 2) { return Number(v.toFixed(d)); }

async function buildSignal(symbol = 'BTCUSDT', interval = '15m', riskUsd = 0.5) {
  const klines = await binancePublic('/api/v3/klines', `symbol=${symbol}&interval=${interval}&limit=120`);
  const closes = klines.map((k) => Number(k[4]));
  const highs = klines.map((k) => Number(k[2]));
  const lows = klines.map((k) => Number(k[3]));
  const volumes = klines.map((k) => Number(k[5]));

  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2] || last;
  const e21 = ema(closes, 21);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const a = atr(klines, 14);
  const r = rsi(closes, 14);
  const m = macd(closes, 12, 26, 9);
  const vw = vwap(klines);
  const bb = bollinger(closes, 20, 2);
  const vNow = volumes[volumes.length - 1];
  const vAvg = volumes.slice(-21, -1).reduce((x, y) => x + y, 0) / 20;
  const hh20 = Math.max(...highs.slice(-20));
  const ll20 = Math.min(...lows.slice(-20));

  const trendLong = last > e200 && e21 > e50;
  const trendShort = last < e200 && e21 < e50;
  const volumeBoost = vNow >= vAvg * 1.05;

  const pullbackLong = last <= e21 * 1.002 && last >= e50 * 0.995 && r > 40 && last > prev;
  const pullbackShort = last >= e21 * 0.998 && last <= e50 * 1.005 && r < 60 && last < prev;

  const breakoutUp = last >= hh20 * 0.999 && prev < hh20 * 0.995 && volumeBoost;
  const breakoutDown = last <= ll20 * 1.001 && prev > ll20 * 1.005 && volumeBoost;

  const reversalLong = r < 30 && last <= bb.lower * 1.01 && last > prev;
  const reversalShort = r > 70 && last >= bb.upper * 0.99 && last < prev;

  let side = 'FLAT';
  let strategy = 'none';

  if (trendLong && pullbackLong) { side = 'LONG'; strategy = 'trend_pullback_long'; }
  else if (trendShort && pullbackShort) { side = 'SHORT'; strategy = 'trend_pullback_short'; }
  else if (trendLong && breakoutUp) { side = 'LONG'; strategy = 'breakout_retest_long'; }
  else if (trendShort && breakoutDown) { side = 'SHORT'; strategy = 'breakout_retest_short'; }
  else if (reversalLong) { side = 'LONG'; strategy = 'reversal_long'; }
  else if (reversalShort) { side = 'SHORT'; strategy = 'reversal_short'; }

  let entry = last, stop = last, take = last;
  if (side === 'LONG') {
    stop = Math.min(ll20, entry - Math.max(a * 1.2, entry * 0.002));
    const risk = Math.abs(entry - stop);
    take = entry + (risk * 2);
  } else if (side === 'SHORT') {
    stop = Math.max(hh20, entry + Math.max(a * 1.2, entry * 0.002));
    const risk = Math.abs(entry - stop);
    take = entry - (risk * 2);
  }

  const dist = Math.abs(entry - stop) || 1;
  const qty = side === 'FLAT' ? 0 : riskUsd / dist;

  const trendScore = Math.min(100, Math.abs((e21 - e50) / last) * 10000);
  const volumeScore = Math.min(100, (vNow / (vAvg || 1)) * 50);
  const volatilityScore = Math.min(100, (a / last) * 10000);
  const totalScore = number((trendScore * 0.45) + (volumeScore * 0.30) + (volatilityScore * 0.25), 2);

  return {
    symbol, interval, time: new Date().toISOString(), strategy, score: totalScore,
    indicators: {
      ema21: number(e21, 4), ema50: number(e50, 4), ema200: number(e200, 4),
      rsi14: number(r, 2), macd: number(m.macd, 4), macdSignal: number(m.signal, 4), macdHist: number(m.hist, 4),
      vwap: number(vw, 4), bbUpper: number(bb.upper, 4), bbLower: number(bb.lower, 4), bbMid: number(bb.mid, 4),
      atr14: number(a, 4), volumeNow: number(vNow, 3), volumeAvg20: number(vAvg, 3), hh20: number(hh20, 4), ll20: number(ll20, 4)
    },
    signal: {
      side, entry: number(entry, 4), stop: number(stop, 4), take: number(take, 4),
      riskUsd: number(riskUsd, 2), qty: number(qty, 8)
    }
  };
}

async function marketScan(limit = 8) {
  const ticker24 = await binancePublic('/api/v3/ticker/24hr');
  const top20 = new Set(['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','TRXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','TONUSDT','SHIBUSDT','ICPUSDT','LTCUSDT','BCHUSDT','APTUSDT','ATOMUSDT','ARBUSDT']);

  const base = ticker24
    .filter((t) => t.symbol.endsWith('USDT'))
    .filter((t) => !t.symbol.includes('UPUSDT') && !t.symbol.includes('DOWNUSDT') && !t.symbol.includes('BULL') && !t.symbol.includes('BEAR'))
    .filter((t) => Number(t.quoteVolume) > 8000000);

  const topVolume = [...base].sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume)).slice(0, 30);
  const topChange = [...base].sort((a, b) => Math.abs(Number(b.priceChangePercent)) - Math.abs(Number(a.priceChangePercent))).slice(0, 20);

  const bySymbol = new Map();
  for (const t of base) bySymbol.set(t.symbol, t);

  const symbols = new Set();
  for (const s of top20) symbols.add(s);
  for (const t of topVolume) symbols.add(t.symbol);
  for (const t of topChange) symbols.add(t.symbol);

  const candidates = [...symbols].map(s => bySymbol.get(s)).filter(Boolean);

  const scored = [];
  for (const t of candidates) {
    try {
      const s = await buildSignal(t.symbol, '15m', 0.5);
      const p = Number(t.priceChangePercent);
      const profitabilityHint = Math.abs(p) * 0.35 + s.score * 0.65;
      scored.push({
        symbol: t.symbol,
        price: number(Number(t.lastPrice), 6),
        change24h: number(p, 2),
        volume24h: number(Number(t.quoteVolume), 2),
        score: number(s.score, 2),
        profitabilityHint: number(profitabilityHint, 2),
        strategy: s.strategy,
        side: s.signal.side
      });
    } catch {}
  }
  scored.sort((a, b) => b.profitabilityHint - a.profitabilityHint);
  return scored.slice(0, limit);
}

function logTrade(trade) { fs.appendFileSync(TRADES_LOG, JSON.stringify(trade) + '\n', 'utf8'); }

async function getSymbolTradingMeta(symbol) {
  const info = await binancePublic('/api/v3/exchangeInfo', `symbol=${symbol}`);
  const s = info?.symbols?.[0];
  if (!s) return { minQty: 0, stepSize: 0, minNotional: 0 };
  const lot = (s.filters || []).find(f => f.filterType === 'LOT_SIZE');
  const minNotionalFilter = (s.filters || []).find(f => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL');
  return {
    minQty: Number(lot?.minQty || 0),
    stepSize: Number(lot?.stepSize || 0),
    minNotional: Number(minNotionalFilter?.minNotional || minNotionalFilter?.notional || 0)
  };
}

function getAssetFree(account, asset) {
  const b = (account?.balances || []).find(x => x.asset === asset);
  return Number(b?.free || 0);
}

function serveStatic(req, res) {
  let pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(WEB_DIR, pathname);
  if (!filePath.startsWith(WEB_DIR)) return sendJson(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'not_found' });

  const ext = path.extname(filePath);
  const contentType = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'application/javascript; charset=utf-8' : 'text/plain; charset=utf-8';
  const headers = { 'Content-Type': contentType };
  // Força no-cache para evitar painel antigo
  if (ext === '.html' || ext === '.js' || ext === '.css') {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
    headers['Pragma'] = 'no-cache';
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, mode: BINANCE_MODE, testnet: BINANCE_BASE_URL.includes('testnet') });

    if (url.pathname === '/api/account' && req.method === 'GET') {
      const acc = await binanceSigned('GET', '/api/v3/account');
      return sendJson(res, 200, { ok: true, makerCommission: acc.makerCommission, takerCommission: acc.takerCommission });
    }

    if (url.pathname === '/api/wallet' && req.method === 'GET') {
      const acc = await binanceSigned('GET', '/api/v3/account');
      const balances = (acc.balances || [])
        .map(b => ({ asset: b.asset, free: Number(b.free), locked: Number(b.locked) }))
        .filter(b => b.free > 0 || b.locked > 0)
        .sort((a, b) => b.free - a.free)
        .slice(0, 30);
      return sendJson(res, 200, { ok: true, mode: BINANCE_MODE, balances });
    }

    if (url.pathname === '/api/signal' && req.method === 'GET') {
      const symbol = (url.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
      const interval = url.searchParams.get('interval') || '15m';
      const riskUsd = Number(url.searchParams.get('riskUsd') || '0.5');
      const data = await buildSignal(symbol, interval, riskUsd);
      return sendJson(res, 200, data);
    }

    if (url.pathname === '/api/market-scan' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') || '8');
      const items = await marketScan(limit);
      return sendJson(res, 200, { time: new Date().toISOString(), items });
    }

    if (url.pathname === '/api/order' && req.method === 'POST') {
      const body = await parseBody(req);
      const symbol = (body.symbol || 'BTCUSDT').toUpperCase();
      const side = (body.side || 'LONG') === 'SHORT' ? 'SELL' : 'BUY';
      const quantityNum = Number(body.qty || 0);
      const quantity = quantityNum.toFixed(6);
      if (!quantity || Number(quantity) <= 0) return sendJson(res, 400, { ok: false, error: 'invalid_qty' });

      const meta = await getSymbolTradingMeta(symbol);
      const ticker = await binancePublic('/api/v3/ticker/price', `symbol=${symbol}`);
      const mark = Number(ticker?.price || 0);
      const notional = mark * Number(quantity);

      if (BINANCE_MODE === 'paper') {
        const order = {
          orderId: `paper_${Date.now()}`,
          symbol,
          side,
          status: 'FILLED',
          type: 'MARKET',
          executedQty: quantity,
          cummulativeQuoteQty: String(notional),
          price: String(mark),
          transactTime: Date.now(),
          paper: true
        };
        logTrade({ id: order.orderId, mode: 'paper', symbol, side, quantity, status: order.status, createdAt: new Date().toISOString(), paperPrice: mark });
        return sendJson(res, 200, { ok: true, order, paper: true });
      }

      if (meta.minQty && Number(quantity) < meta.minQty) {
        return sendJson(res, 400, {
          ok: false,
          error: 'min_qty',
          message: `Quantidade abaixo do mínimo para ${symbol}. Mínimo: ${meta.minQty}`
        });
      }

      if (meta.minNotional && notional < meta.minNotional) {
        return sendJson(res, 400, {
          ok: false,
          error: 'min_notional',
          message: `Você não tem valor mínimo para operar ${symbol}. Mínimo de ordem: ${meta.minNotional} USDT.`
        });
      }

      const account = await binanceSigned('GET', '/api/v3/account');
      const baseAsset = symbol.replace(/USDT$/, '');
      const usdtFree = getAssetFree(account, 'USDT');
      const baseFree = getAssetFree(account, baseAsset);

      if (side === 'BUY' && usdtFree < notional) {
        return sendJson(res, 400, {
          ok: false,
          error: 'insufficient_usdt',
          message: `Saldo insuficiente. Disponível: ${usdtFree.toFixed(4)} USDT, necessário: ${notional.toFixed(4)} USDT.`
        });
      }

      if (side === 'SELL' && baseFree < Number(quantity)) {
        return sendJson(res, 400, {
          ok: false,
          error: 'insufficient_asset',
          message: `Saldo insuficiente de ${baseAsset}. Disponível: ${baseFree.toFixed(6)}, necessário: ${Number(quantity).toFixed(6)}.`
        });
      }

      const order = await binanceSigned('POST', '/api/v3/order', {
        symbol,
        side,
        type: 'MARKET',
        quantity,
        newClientOrderId: `copilot_${Date.now()}`
      });

      logTrade({ id: order.orderId, mode: BINANCE_MODE, symbol, side, quantity, status: order.status, createdAt: new Date().toISOString() });
      return sendJson(res, 200, { ok: true, order, wallet: { usdtFree, baseAsset, baseFree } });
    }

    if (url.pathname === '/api/confirm' && req.method === 'POST') {
      const body = await parseBody(req);
      const trade = {
        id: `paper_${Date.now()}`,
        mode: 'paper',
        symbol: body.symbol || 'BTCUSDT',
        side: body.side || 'FLAT',
        entry: Number(body.entry || 0),
        stop: Number(body.stop || 0),
        take: Number(body.take || 0),
        qty: Number(body.qty || 0),
        riskUsd: Number(body.riskUsd || 0.5),
        strategy: body.strategy || 'manual',
        createdAt: new Date().toISOString(),
        status: 'CONFIRMED_MANUAL'
      };
      logTrade(trade);
      return sendJson(res, 200, { ok: true, trade });
    }

    if (url.pathname === '/api/trades' && req.method === 'GET') {
      if (!fs.existsSync(TRADES_LOG)) return sendJson(res, 200, { items: [] });
      const lines = fs.readFileSync(TRADES_LOG, 'utf8').trim();
      if (!lines) return sendJson(res, 200, { items: [] });
      const items = lines.split('\n').slice(-40).map((l) => JSON.parse(l));
      return sendJson(res, 200, { items: items.reverse() });
    }

    if (url.pathname === '/api/auto-state' && req.method === 'GET') {
      const state = fs.existsSync(AUTO_STATE_FILE) ? JSON.parse(fs.readFileSync(AUTO_STATE_FILE, 'utf8')) : null;
      const botLog = fs.existsSync(AUTO_BOT_LOG) ? fs.readFileSync(AUTO_BOT_LOG, 'utf8').trim().split('\n').slice(-40).reverse() : [];
      const supLog = fs.existsSync(AUTO_SUP_LOG) ? fs.readFileSync(AUTO_SUP_LOG, 'utf8').trim().split('\n').slice(-20).reverse() : [];
      let botMode = 'turbo';
      try {
        if (fs.existsSync(BOT_MODE_FILE)) {
          const bm = JSON.parse(fs.readFileSync(BOT_MODE_FILE, 'utf8'));
          if (bm?.mode) botMode = bm.mode;
        }
      } catch {}
      return sendJson(res, 200, { state, botLog, supLog, mode: BINANCE_MODE, botMode });
    }

    if (url.pathname === '/api/bot-status' && req.method === 'GET') {
      const state = fs.existsSync(AUTO_STATE_FILE) ? JSON.parse(fs.readFileSync(AUTO_STATE_FILE, 'utf8')) : null;
      let botMode = 'ultra';
      try {
        if (fs.existsSync(BOT_MODE_FILE)) {
          const bm = JSON.parse(fs.readFileSync(BOT_MODE_FILE, 'utf8'));
          if (bm?.mode) botMode = bm.mode;
        }
      } catch {}
      const cfg = {
        accountBalance: Number(process.env.ACCOUNT_BALANCE || 10000),
        riskPerTradePct: 1,
        maxExposurePct: 5,
        maxPositions: 3,
        allowedSymbols: ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','TRXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','TONUSDT','SHIBUSDT','ICPUSDT','LTCUSDT','BCHUSDT','APTUSDT','ATOMUSDT','ARBUSDT'],
        intervals: ['4h','1h','15m'],
        minRR: 2.0,
        minProfitPct: 0.10,
        cooldownMin: 0,
        maxHoldMin: 360,
        maxTradesPerDay: 10,
        circuitBreaker: { consecutiveLosses: 3, pauseHours: 6 },
        filters: {
          ema21_50_200: true,
          rsi14: true,
          macd: true,
          vwap: true,
          bollinger: true,
          mtfAligned: true,
        },
        mode: botMode,
        exchangeMode: BINANCE_MODE
      };
      return sendJson(res, 200, { ok: true, cfg, state });
    }

    if (url.pathname === '/api/bot-mode' && req.method === 'GET') {
      let botMode = 'turbo';
      try {
        if (fs.existsSync(BOT_MODE_FILE)) {
          const bm = JSON.parse(fs.readFileSync(BOT_MODE_FILE, 'utf8'));
          if (bm?.mode) botMode = bm.mode;
        }
      } catch {}
      return sendJson(res, 200, { ok: true, mode: botMode });
    }

    if (url.pathname === '/api/bot-mode' && req.method === 'POST') {
      const body = await parseBody(req);
      const allowed = ['slow', 'conservative', 'fast', 'turbo', 'ultra'];
      const mode = String(body.mode || '').toLowerCase();
      if (!allowed.includes(mode)) return sendJson(res, 400, { ok: false, error: 'invalid_mode', allowed });
      fs.writeFileSync(BOT_MODE_FILE, JSON.stringify({ mode, updatedAt: new Date().toISOString() }, null, 2));
      return sendJson(res, 200, { ok: true, mode });
    }

    if (url.pathname === '/api/credentials' && req.method === 'POST') {
      const body = await parseBody(req);
      const apiKey = String(body.apiKey || '').trim();
      const apiSecret = String(body.apiSecret || '').trim();
      const mode = String(body.exchangeMode || 'testnet').trim();
      const baseUrl = String(body.baseUrl || (mode === 'testnet' ? 'https://testnet.binance.vision' : 'https://api.binance.com')).trim();
      if (!apiKey || !apiSecret) return sendJson(res, 400, { ok: false, error: 'missing_api_or_secret' });
      writeEnv({
        BINANCE_MODE: mode,
        BINANCE_BASE_URL: baseUrl,
        BINANCE_API_KEY: apiKey,
        BINANCE_API_SECRET: apiSecret
      });
      reloadEnv();
      return sendJson(res, 200, { ok: true, mode: BINANCE_MODE, baseUrl: BINANCE_BASE_URL });
    }

    if (url.pathname === '/api/credentials/clear' && req.method === 'POST') {
      writeEnv({
        BINANCE_MODE: 'paper',
        BINANCE_BASE_URL: 'https://testnet.binance.vision',
        BINANCE_API_KEY: '',
        BINANCE_API_SECRET: ''
      });
      reloadEnv();
      return sendJson(res, 200, { ok: true, cleared: true });
    }

    if (url.pathname === '/api/credentials/mode' && req.method === 'POST') {
      const body = await parseBody(req);
      const next = String(body.mode || '').toLowerCase();
      if (!['real', 'testnet', 'paper'].includes(next)) return sendJson(res, 400, { ok: false, error: 'invalid_mode' });
      const baseUrl = next === 'testnet' ? 'https://testnet.binance.vision' : 'https://api.binance.com';
      writeEnv({
        BINANCE_MODE: next,
        BINANCE_BASE_URL: baseUrl,
        BINANCE_API_KEY: BINANCE_API_KEY || '',
        BINANCE_API_SECRET: BINANCE_API_SECRET || ''
      });
      reloadEnv();
      return sendJson(res, 200, { ok: true, mode: BINANCE_MODE, baseUrl: BINANCE_BASE_URL });
    }

    if (url.pathname === '/api/credentials/status' && req.method === 'GET') {
      const hasApi = !!BINANCE_API_KEY;
      return sendJson(res, 200, {
        ok: true,
        hasApi,
        mode: BINANCE_MODE,
        baseUrl: BINANCE_BASE_URL,
        keyPreview: hasApi ? `${BINANCE_API_KEY.slice(0, 6)}...${BINANCE_API_KEY.slice(-4)}` : null
      });
    }

    if (url.pathname === '/api/brand' && req.method === 'GET') {
      let brand = { title: 'NEXUS', subtitle: 'TRADE COMMAND' };
      try {
        if (fs.existsSync(BRAND_FILE)) {
          const data = JSON.parse(fs.readFileSync(BRAND_FILE, 'utf8'));
          brand = { ...brand, ...data };
        }
      } catch {}
      return sendJson(res, 200, { ok: true, brand });
    }

    if (url.pathname === '/api/brand' && req.method === 'POST') {
      const body = await parseBody(req);
      const title = String(body.title || '').trim().slice(0, 32) || 'NEXUS';
      const subtitle = String(body.subtitle || '').trim().slice(0, 48) || 'TRADE COMMAND';
      const logo = String(body.logo || '').trim().slice(0, 4) || '';
      const brand = { title, subtitle, logo, updatedAt: new Date().toISOString() };
      fs.writeFileSync(BRAND_FILE, JSON.stringify(brand, null, 2));
      return sendJson(res, 200, { ok: true, brand });
    }

    return serveStatic(req, res);
  } catch (err) {
    return sendJson(res, 500, { error: 'internal_error', message: String(err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Trade Copilot listening on http://${HOST}:${PORT} mode=${BINANCE_MODE}`);
});
