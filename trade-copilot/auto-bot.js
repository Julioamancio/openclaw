const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8090';
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'auto-state.json');
const LOG_FILE = path.join(DATA_DIR, 'auto-bot.log');
const TRADES_FILE = path.join(DATA_DIR, 'paper-trades.jsonl');
const BOT_MODE_FILE = path.join(DATA_DIR, 'bot-mode.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MODES = {
  slow: { loopMs: 60_000, riskUsd: 0.30, minHint: 45, minScore: 40, minRR: 1.8, maxTradesPerDay: 8, cooldownMin: 20, maxHoldMin: 120, mode: 'slow' },
  conservative: { loopMs: 30_000, riskUsd: 0.30, minHint: 35, minScore: 30, minRR: 1.7, maxTradesPerDay: 20, cooldownMin: 8, maxHoldMin: 60, mode: 'conservative' },
  fast: { loopMs: 15_000, riskUsd: 0.30, minHint: 25, minScore: 28, minRR: 1.6, maxTradesPerDay: 50, cooldownMin: 3, maxHoldMin: 25, mode: 'fast' },
  turbo: { loopMs: 10_000, riskUsd: 0.28, minHint: 20, minScore: 26, minRR: 1.5, maxTradesPerDay: 80, cooldownMin: 1, maxHoldMin: 10, mode: 'turbo' },
  ultra: { loopMs: 7_000, riskUsd: 0.25, minHint: 18, minScore: 24, minRR: 1.4, maxTradesPerDay: 140, cooldownMin: 0.5, maxHoldMin: 6, mode: 'ultra' }
};

const DEFAULT_MODE = 'ultra';


function nowIso() { return new Date().toISOString(); }
function dayKey() { return new Date().toISOString().slice(0, 10); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function n(v, d = 4) { return Number(Number(v).toFixed(d)); }

function log(msg, meta = null) {
  const line = `[${nowIso()}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

function appendTrade(entry) {
  fs.appendFileSync(TRADES_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

function loadRuntimeCfg() {
  let mode = DEFAULT_MODE;
  try {
    if (fs.existsSync(BOT_MODE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(BOT_MODE_FILE, 'utf8'));
      if (raw?.mode && MODES[raw.mode]) mode = raw.mode;
    }
  } catch {}
  return MODES[mode];
}

function defaultState() {
  return {
    day: dayKey(),
    tradesToday: 0,
    lastTradeAt: null,
    loops: 0,
    errors: 0,
    openTrade: null,
    stats: {
      total: 0,
      wins: 0,
      losses: 0,
      pnlUsd: 0,
      avgWin: 0,
      avgLoss: 0,
      byStrategy: {}
    }
  };
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return defaultState();
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!s.stats) s.stats = defaultState().stats;
    return s;
  } catch { return defaultState(); }
}

function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

async function jget(url) {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
  return j;
}

function minsSince(iso) {
  if (!iso) return 999999;
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

function calcRR(sig) {
  const risk = Math.abs(Number(sig.signal.entry) - Number(sig.signal.stop));
  const reward = Math.abs(Number(sig.signal.take) - Number(sig.signal.entry));
  if (!risk) return 0;
  return reward / risk;
}

async function bestSignalForSymbol(symbol, riskUsd) {
  const intervals = ['1m', '5m', '15m'];
  const candidates = [];

  for (const interval of intervals) {
    try {
      const sig = await jget(`${BASE}/api/signal?symbol=${symbol}&interval=${interval}&riskUsd=${riskUsd}`);
      if (sig?.signal?.side && sig.signal.side !== 'FLAT') {
        candidates.push({ ...sig, interval });
      }
    } catch {}
  }

  if (!candidates.length) return null;

  const longVotes = candidates.filter(c => c.signal.side === 'LONG').length;
  const shortVotes = candidates.filter(c => c.signal.side === 'SHORT').length;
  const votedSide = longVotes === shortVotes ? null : (longVotes > shortVotes ? 'LONG' : 'SHORT');

  const filtered = votedSide ? candidates.filter(c => c.signal.side === votedSide) : candidates;
  filtered.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  return filtered[0];
}

function updateStatsOnClose(state, trade) {
  const st = state.stats;
  st.total += 1;
  st.pnlUsd = n(st.pnlUsd + trade.pnlUsd, 4);
  const win = trade.pnlUsd > 0;
  if (win) st.wins += 1; else st.losses += 1;

  const wins = st.wins || 1;
  const losses = st.losses || 1;
  const totalWinPnl = st.avgWin * (wins - (win ? 1 : 0)) + (win ? trade.pnlUsd : 0);
  const totalLossPnl = st.avgLoss * (losses - (win ? 0 : 1)) + (!win ? trade.pnlUsd : 0);
  st.avgWin = n(totalWinPnl / wins, 4);
  st.avgLoss = n(totalLossPnl / losses, 4);

  const key = trade.strategy || 'unknown';
  if (!st.byStrategy[key]) st.byStrategy[key] = { total: 0, wins: 0, losses: 0, pnlUsd: 0 };
  st.byStrategy[key].total += 1;
  if (win) st.byStrategy[key].wins += 1; else st.byStrategy[key].losses += 1;
  st.byStrategy[key].pnlUsd = n(st.byStrategy[key].pnlUsd + trade.pnlUsd, 4);
}

function closeTrade(state, reason, markPrice) {
  const t = state.openTrade;
  if (!t) return;
  const dir = t.side === 'LONG' ? 1 : -1;
  const move = (markPrice - t.entry) * dir;
  const pnl = (move / Math.abs(t.entry - t.stop)) * t.riskUsd;
  const closed = {
    ...t,
    closedAt: nowIso(),
    closeReason: reason,
    exit: n(markPrice, 6),
    pnlUsd: n(pnl, 4)
  };
  updateStatsOnClose(state, closed);
  appendTrade({
    id: `${closed.id}_close`,
    mode: 'paper-learn',
    symbol: closed.symbol,
    side: closed.side === 'LONG' ? 'SELL' : 'BUY',
    quantity: closed.qty,
    status: `CLOSED_${reason.toUpperCase()}`,
    pnlUsd: closed.pnlUsd,
    createdAt: closed.closedAt
  });
  state.openTrade = null;
  log('trade:closed', {
    symbol: closed.symbol,
    side: closed.side,
    reason,
    pnlUsd: closed.pnlUsd,
    totalPnl: state.stats.pnlUsd,
    wr: `${state.stats.wins}/${state.stats.total}`
  });
}

async function manageOpenTrade(state, cfg) {
  const t = state.openTrade;
  if (!t) return;

  let mark = Number(t.entry);
  try {
    const fast = await jget(`${BASE}/api/signal?symbol=${t.symbol}&interval=1m&riskUsd=${t.riskUsd}`);
    if (fast?.signal?.entry) mark = Number(fast.signal.entry);
  } catch {}

  if (minsSince(t.openedAt) >= cfg.maxHoldMin) {
    return closeTrade(state, 'time_exit', mark);
  }

  const sig = await bestSignalForSymbol(t.symbol, t.riskUsd);
  if (!sig) return;

  if ((t.side === 'LONG' && sig.signal.side === 'SHORT') || (t.side === 'SHORT' && sig.signal.side === 'LONG')) {
    return closeTrade(state, 'signal_flip', mark);
  }

  if (t.side === 'LONG') {
    if (mark <= t.stop) return closeTrade(state, 'stop', mark);
    if (mark >= t.take) return closeTrade(state, 'take', mark);
  } else {
    if (mark >= t.stop) return closeTrade(state, 'stop', mark);
    if (mark <= t.take) return closeTrade(state, 'take', mark);
  }
}

async function maybeOpenTrade(state, cfg) {
  if (state.openTrade) return;
  if (state.tradesToday >= cfg.maxTradesPerDay) return log('skip:maxTradesPerDay', { tradesToday: state.tradesToday });
  if (minsSince(state.lastTradeAt) < cfg.cooldownMin) return log('skip:cooldown', { lastTradeAt: state.lastTradeAt });

  const scan = await jget(`${BASE}/api/market-scan?limit=6`);
  const best = scan.items && scan.items[0];
  if (!best) return log('skip:noBest');

  if (best.profitabilityHint < cfg.minHint || best.score < cfg.minScore || best.side === 'FLAT') {
    return log('skip:weakSetup', { symbol: best.symbol, hint: best.profitabilityHint, score: best.score, side: best.side });
  }

  const sig = await bestSignalForSymbol(best.symbol, cfg.riskUsd);
  if (!sig || !sig.signal || sig.signal.side === 'FLAT' || sig.signal.qty <= 0) {
    return log('skip:invalidSignal', { symbol: best.symbol });
  }

  const rr = calcRR(sig);
  if (rr < (cfg.minRR || 1.5)) {
    return log('skip:lowRR', { symbol: best.symbol, rr: n(rr, 3), minRR: cfg.minRR || 1.5 });
  }

  const strategyKey = `${sig.strategy}@${sig.interval}`;
  const stg = state.stats?.byStrategy?.[strategyKey];
  if (stg && stg.total >= 8 && stg.pnlUsd < -0.6) {
    return log('skip:badStrategyWindow', { strategy: strategyKey, pnl: stg.pnlUsd, total: stg.total });
  }

  state.openTrade = {
    id: `learn_${Date.now()}`,
    symbol: sig.symbol,
    side: sig.signal.side,
    strategy: `${sig.strategy}@${sig.interval}`,
    openedAt: nowIso(),
    entry: Number(sig.signal.entry),
    stop: Number(sig.signal.stop),
    take: Number(sig.signal.take),
    qty: Number(sig.signal.qty),
    riskUsd: Number(sig.signal.riskUsd),
    score: Number(sig.score),
    rr: n(rr, 3)
  };
  state.tradesToday += 1;
  state.lastTradeAt = nowIso();

  appendTrade({
    id: state.openTrade.id,
    mode: 'paper-learn',
    symbol: state.openTrade.symbol,
    side: state.openTrade.side === 'LONG' ? 'BUY' : 'SELL',
    quantity: state.openTrade.qty,
    status: 'OPENED_AUTO',
    strategy: state.openTrade.strategy,
    createdAt: state.openTrade.openedAt
  });

  log('trade:opened', {
    symbol: state.openTrade.symbol,
    side: state.openTrade.side,
    strategy: state.openTrade.strategy,
    entry: state.openTrade.entry,
    stop: state.openTrade.stop,
    take: state.openTrade.take,
    riskUsd: state.openTrade.riskUsd,
    rr: state.openTrade.rr,
    tradesToday: state.tradesToday
  });
}

async function cycle(cfg) {
  const state = loadState();
  if (state.day !== dayKey()) {
    state.day = dayKey();
    state.tradesToday = 0;
  }
  state.loops += 1;

  await manageOpenTrade(state, cfg);
  await maybeOpenTrade(state, cfg);

  saveState(state);
}

async function main() {
  let lastMode = null;
  for (;;) {
    const cfg = loadRuntimeCfg();
    if (cfg.mode !== lastMode) {
      log('auto-bot:start', cfg);
      lastMode = cfg.mode;
    }
    try {
      await cycle(cfg);
    } catch (e) {
      const s = loadState();
      s.errors = (s.errors || 0) + 1;
      saveState(s);
      log('error', { message: String(e.message || e) });
    }
    await sleep(cfg.loopMs);
  }
}

main();
