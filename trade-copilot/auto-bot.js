const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8090';
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'auto-state.json');
const LOG_FILE = path.join(DATA_DIR, 'auto-bot.log');
const TRADES_FILE = path.join(DATA_DIR, 'paper-trades.jsonl');
const BOT_MODE_FILE = path.join(DATA_DIR, 'bot-mode.json');
// Saldo paper para sizing (pode vir de env ACCOUNT_BALANCE)
const ACCOUNT_BALANCE = Number(process.env.ACCOUNT_BALANCE || 1000);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MODES = {
  slow: { loopMs: 60_000, riskUsd: 0.30, minHint: 45, minScore: 40, minRR: 1.8, minVolPct: 0.0009, requireUnanimous: true, maxTradesPerDay: 8, cooldownMin: 20, maxHoldMin: 120, minProfitPct: 0.10, mode: 'slow' },
  conservative: { loopMs: 30_000, riskUsd: 0.30, minHint: 35, minScore: 30, minRR: 1.8, minVolPct: 0.0008, requireUnanimous: true, maxTradesPerDay: 20, cooldownMin: 10, maxHoldMin: 80, minProfitPct: 0.10, mode: 'conservative' },
  fast: { loopMs: 15_000, riskUsd: 0.30, minHint: 25, minScore: 28, minRR: 1.7, minVolPct: 0.0007, requireUnanimous: false, maxTradesPerDay: 50, cooldownMin: 5, maxHoldMin: 25, minProfitPct: 0.10, mode: 'fast' },
  turbo: { loopMs: 10_000, riskUsd: 0.28, minHint: 20, minScore: 26, minRR: 1.6, minVolPct: 0.00065, requireUnanimous: false, maxTradesPerDay: 80, cooldownMin: 3, maxHoldMin: 15, minProfitPct: 0.10, mode: 'turbo' },
  // Ultra calibrado para 1h: menos ruído, hold maior, RR mais alto
  ultra: { loopMs: 10_000, riskUsd: 0.25, minHint: 20, minScore: 26, minRR: 1.8, minVolPct: 0.00075, requireUnanimous: true, maxTradesPerDay: 10, cooldownMin: 12, maxHoldMin: 360, minProfitPct: 0.10, mode: 'ultra' }
};

// Restrição de símbolos: só ETH e BTC (spot)
const ALLOWED_SYMBOLS = new Set(['ETHUSDT', 'BTCUSDT']);

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
    openTrades: [],
    stats: {
      total: 0,
      wins: 0,
      losses: 0,
      pnlUsd: 0,
      avgWin: 0,
      avgLoss: 0,
      byStrategy: {},
      consecutiveLosses: 0,
      pausedUntil: null
    },
    ml: {
      byRegimeStrategy: {}
    }
  };
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return defaultState();
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!s.stats) s.stats = defaultState().stats;
    if (!s.ml) s.ml = defaultState().ml;
    if (!s.ml.byRegimeStrategy) s.ml.byRegimeStrategy = {};
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

function detectRegime(sig) {
  const e20 = Number(sig?.indicators?.ema20 || 0);
  const e50 = Number(sig?.indicators?.ema50 || 0);
  const atr = Number(sig?.indicators?.atr14 || 0);
  const entry = Number(sig?.signal?.entry || 1);
  const trend = Math.abs(e20 - e50) / entry;
  const vol = atr / entry;
  if (trend > 0.0015 && vol > 0.001) return 'trend_high_vol';
  if (trend > 0.001) return 'trend';
  if (vol > 0.0012) return 'choppy_high_vol';
  return 'range';
}

function getMlWeight(state, regime, strategyKey) {
  const key = `${regime}|${strategyKey}`;
  const v = Number(state.ml?.byRegimeStrategy?.[key] || 0);
  return Math.max(-2.5, Math.min(2.5, v));
}

function updateMlWeight(state, regime, strategyKey, pnlNorm) {
  const key = `${regime}|${strategyKey}`;
  const prev = Number(state.ml?.byRegimeStrategy?.[key] || 0);
  const lr = 0.18;
  const next = (1 - lr) * prev + lr * pnlNorm;
  state.ml.byRegimeStrategy[key] = n(Math.max(-3, Math.min(3, next)), 4);
}

async function bestSignalForSymbol(symbol, riskUsd, cfg) {
  if (!ALLOWED_SYMBOLS.has(symbol)) return null;

  const intervals = ['4h', '1h', '15m'];
  const candidates = [];
  const signalsByTf = {};

  for (const interval of intervals) {
    try {
      const sig = await jget(`${BASE}/api/signal?symbol=${symbol}&interval=${interval}&riskUsd=${riskUsd}`);
      if (sig?.signal?.side && sig.signal.side !== 'FLAT') {
        const atr = Number(sig?.indicators?.atr14 || 0);
        const entry = Number(sig?.signal?.entry || 0);
        const volPct = entry > 0 ? atr / entry : 0;
        const rsi = Number(sig?.indicators?.rsi14 || 0);
        const ema20 = Number(sig?.indicators?.ema20 || 0);
        const ema50 = Number(sig?.indicators?.ema50 || 0);
        const ema200 = Number(sig?.indicators?.ema200 || 0);

        signalsByTf[interval] = { ...sig, entry, rsi, ema20, ema50, ema200, volPct };

        // Filtros de 1h para evitar vender fundo e comprar sem retomada de tendência
        if (interval === '1h') {
          if (sig.signal.side === 'SHORT' && rsi && rsi < 30) continue;
          if (sig.signal.side === 'LONG') {
            if ((ema20 && entry < ema20) || (ema50 && entry < ema50) || (ema200 && entry < ema200)) continue;
          }
        }

        candidates.push({ ...sig, interval, volPct, rsi, ema20, ema50, ema200 });
      }
    } catch {}
  }

  if (!candidates.length) return null;

  // Confirmação multi-timeframe: 4h direção, 1h setup, 15m gatilho
  const sig4h = signalsByTf['4h'];
  const sig1h = signalsByTf['1h'];
  const sig15m = signalsByTf['15m'];
  if (!sig4h || !sig1h || !sig15m) return null;

  const side4h = sig4h.signal.side;
  const side1h = sig1h.signal.side;
  const side15 = sig15m.signal.side;

  // Tendência: exigir que 1h alinhe com 4h; gatilho 15m no mesmo sentido
  if (side4h === 'FLAT' || side1h === 'FLAT' || side15 === 'FLAT') return null;
  if (!(side4h === side1h && side1h === side15)) return null;

  // Tendência estrutural: preço acima EMA200 para LONG; abaixo para SHORT
  const entry1h = sig1h.signal.entry;
  const ema200_1h = Number(sig1h.indicators?.ema200 || 0);
  if (side1h === 'LONG' && ema200_1h && entry1h < ema200_1h) return null;
  if (side1h === 'SHORT' && ema200_1h && entry1h > ema200_1h) return null;

  // Voto final: usa o sinal do 15m como candidato principal
  const volFiltered = candidates.filter(c => c.volPct >= (cfg.minVolPct || 0) && c.interval === '15m');
  if (!volFiltered.length) return null;
  volFiltered.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  return { ...volFiltered[0], mtf: { side4h, side1h, side15 } };
}

function updateStatsOnClose(state, trade) {
  const st = state.stats;
  st.total += 1;
  st.pnlUsd = n(st.pnlUsd + trade.pnlUsd, 4);
  const win = trade.pnlUsd > 0;
  if (win) {
    st.wins += 1;
    st.consecutiveLosses = 0;
  } else {
    st.losses += 1;
    st.consecutiveLosses = (st.consecutiveLosses || 0) + 1;
    // Circuit breaker: pausa 6h após 3 perdas seguidas
    if (st.consecutiveLosses >= 3) {
      const pauseMs = 6 * 60 * 60 * 1000;
      st.pausedUntil = new Date(Date.now() + pauseMs).toISOString();
    }
  }

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

function closeTrade(state, idx, reason, markPrice) {
  const t = state.openTrades[idx];
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
  const pnlNorm = closed.riskUsd ? (closed.pnlUsd / closed.riskUsd) : 0;
  updateMlWeight(state, closed.regime || 'unknown', closed.strategy || 'unknown', pnlNorm);
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
  state.openTrades.splice(idx,1);
  log('trade:closed', {
    symbol: closed.symbol,
    side: closed.side,
    reason,
    pnlUsd: closed.pnlUsd,
    totalPnl: state.stats.pnlUsd,
    wr: `${state.stats.wins}/${state.stats.total}`
  });
}

async function manageOpenTrades(state, cfg) {
  if (!state.openTrades || !state.openTrades.length) return;
  for (let i = state.openTrades.length -1; i>=0; i--) {
    const t = state.openTrades[i];
    let mark = Number(t.entry);
    try {
      const fast = await jget(`${BASE}/api/signal?symbol=${t.symbol}&interval=1m&riskUsd=${t.riskUsd}`);
      if (fast?.signal?.entry) mark = Number(fast.signal.entry);
    } catch {}

    const profitPct = t.side === 'LONG'
      ? (mark - t.entry) / t.entry
      : (t.entry - mark) / t.entry;
    const minProfitPct = cfg.minProfitPct || 0;

    if (minsSince(t.openedAt) >= cfg.maxHoldMin) {
      if (profitPct >= minProfitPct) { closeTrade(state, i, 'time_exit', mark); continue; }
    }

    const sig = await bestSignalForSymbol(t.symbol, t.riskUsd, cfg);
    if (sig) {
      if ((t.side === 'LONG' && sig.signal.side === 'SHORT') || (t.side === 'SHORT' && sig.signal.side === 'LONG')) {
        if (profitPct >= minProfitPct) { closeTrade(state, i, 'signal_flip', mark); continue; }
      }
    }

    if (t.side === 'LONG') {
      if (mark <= t.stop) { closeTrade(state, i, 'stop', mark); continue; }
      if (mark >= t.take) { closeTrade(state, i, 'take', mark); continue; }
    } else {
      if (mark >= t.stop) { closeTrade(state, i, 'stop', mark); continue; }
      if (mark <= t.take) { closeTrade(state, i, 'take', mark); continue; }
    }
  }
}

async function maybeOpenTrade(state, cfg) {
  if (!state.openTrades) state.openTrades = [];
  if (state.openTrades.length >= 3) return log('skip:maxPositions', { open: state.openTrades.length });
  if (state.stats?.pausedUntil && new Date(state.stats.pausedUntil) > new Date()) {
    return log('skip:paused', { pausedUntil: state.stats.pausedUntil });
  }
  if (state.tradesToday >= cfg.maxTradesPerDay) return log('skip:maxTradesPerDay', { tradesToday: state.tradesToday });
  if (minsSince(state.lastTradeAt) < cfg.cooldownMin) return log('skip:cooldown', { lastTradeAt: state.lastTradeAt });

  const scan = await jget(`${BASE}/api/market-scan?limit=10`);
  const allowed = (scan.items || []).filter(it => ALLOWED_SYMBOLS.has(it.symbol));
  const best = allowed[0];
  if (!best) return log('skip:noBestAllowed');

  if (best.profitabilityHint < cfg.minHint || best.score < cfg.minScore || best.side === 'FLAT') {
    return log('skip:weakSetup', { symbol: best.symbol, hint: best.profitabilityHint, score: best.score, side: best.side });
  }

  const sig = await bestSignalForSymbol(best.symbol, cfg.riskUsd, cfg);
  if (!sig || !sig.signal || sig.signal.side === 'FLAT' || sig.signal.qty <= 0) {
    return log('skip:invalidSignal', { symbol: best.symbol });
  }

  const rr = calcRR(sig);
  if (rr < (cfg.minRR || 1.5)) {
    return log('skip:lowRR', { symbol: best.symbol, rr: n(rr, 3), minRR: cfg.minRR || 1.5 });
  }

  // Sizing: risco 1% do saldo (paper). Exposição máx 5% e máx 3 posições
  const balance = ACCOUNT_BALANCE;
  const maxExposureUsd = balance * 0.05;
  const riskUsd = balance * 0.01;
  const stopDist = Math.abs(Number(sig.signal.entry) - Number(sig.signal.stop));
  if (!stopDist) return log('skip:noStopDist', { symbol: best.symbol });
  let qty = riskUsd / stopDist;
  let exposureUsd = qty * Number(sig.signal.entry);
  if (exposureUsd > maxExposureUsd) {
    qty = maxExposureUsd / Number(sig.signal.entry);
    exposureUsd = qty * Number(sig.signal.entry);
  }

  // Checa exposição agregada
  const currentExposure = (state.openTrades || []).reduce((s,t)=> s + (Number(t.entry)*Number(t.qty)), 0);
  if (currentExposure + exposureUsd > maxExposureUsd) {
    return log('skip:aggExposure', { currentExposure, attempted: exposureUsd, maxExposureUsd });
  }

  if (qty <= 0) return log('skip:qtyZero', { symbol: best.symbol });

  const strategyKey = `${sig.strategy}@${sig.interval}`;
  const regime = detectRegime(sig);
  const mlWeight = getMlWeight(state, regime, strategyKey);
  const stg = state.stats?.byStrategy?.[strategyKey];
  if (stg && stg.total >= 8 && stg.pnlUsd < -0.6) {
    return log('skip:badStrategyWindow', { strategy: strategyKey, pnl: stg.pnlUsd, total: stg.total });
  }

  if (mlWeight < -0.65) {
    return log('skip:mlNegativeBias', { strategy: strategyKey, regime, mlWeight: n(mlWeight, 3) });
  }

  // Enforce mínimo de lucro desejado no take (ex.: 10%)
  const entry = Number(sig.signal.entry);
  let take = Number(sig.signal.take);
  const minProfitPct = cfg.minProfitPct || 0;
  if (sig.signal.side === 'LONG') {
    const minTake = entry * (1 + minProfitPct);
    if (take < minTake) take = minTake;
  } else {
    const minTake = entry * (1 - minProfitPct);
    if (take > minTake) take = minTake;
  }

  const newTrade = {
    id: `learn_${Date.now()}`,
    symbol: sig.symbol,
    side: sig.signal.side,
    strategy: `${sig.strategy}@${sig.interval}`,
    regime,
    mlWeight: n(mlWeight, 3),
    openedAt: nowIso(),
    entry,
    stop: Number(sig.signal.stop),
    take: n(take, 6),
    qty: n(qty, 6),
    riskUsd: n(riskUsd, 4),
    score: Number(sig.score),
    rr: n(rr, 3)
  };
  state.openTrades.push(newTrade);
  state.tradesToday += 1;
  state.lastTradeAt = nowIso();

  appendTrade({
    id: newTrade.id,
    mode: 'paper-learn',
    symbol: newTrade.symbol,
    side: newTrade.side === 'LONG' ? 'BUY' : 'SELL',
    quantity: newTrade.qty,
    status: 'OPENED_AUTO',
    strategy: newTrade.strategy,
    entry: newTrade.entry,
    stop: newTrade.stop,
    take: newTrade.take,
    riskUsd: newTrade.riskUsd,
    rr: newTrade.rr,
    createdAt: newTrade.openedAt
  });

  log('trade:opened', {
    symbol: newTrade.symbol,
    side: newTrade.side,
    strategy: newTrade.strategy,
    entry: newTrade.entry,
    stop: newTrade.stop,
    take: newTrade.take,
    riskUsd: newTrade.riskUsd,
    rr: newTrade.rr,
    regime: newTrade.regime,
    mlWeight: newTrade.mlWeight,
    tradesToday: state.tradesToday,
    openPositions: state.openTrades.length
  });
}

async function cycle(cfg) {
  const state = loadState();
  if (state.day !== dayKey()) {
    state.day = dayKey();
    state.tradesToday = 0;
  }
  state.loops += 1;

  await manageOpenTrades(state, cfg);
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
