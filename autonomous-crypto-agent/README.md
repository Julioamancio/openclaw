# Autonomous Crypto Trading Agent (Binance)

## Run
```bash
cd /root/.openclaw/workspace/autonomous-crypto-agent
cp .env.example .env
npm install
npm start
```

Dashboard: `http://<server-ip>:8787`

## Modes
- `paper` (default)
- `real` (visual + execution guards)

## Safety defaults
- `TRADING_MODE=paper`
- `REAL_TRADING_ENABLED=false` (can be toggled in UI/API)
- `PAPER_MIN_DAYS=7`

## Current implementation (updated)
- 1-minute scan loop (configurable)
- Binance market data scan
- Multi-timeframe analysis: 4H / 1H / 15M
- Indicators: EMA 21/50/200, RSI, MACD, VWAP, Bollinger Bands
- Strategy engine with 4 strategy families:
  - Trend Continuation Pullback
  - Breakout + Retest
  - Reversal at Major Level
  - Range Rotation
- Paper execution with risk controls
- Profile-based speed/behavior controls in UI:
  - Conservative / Balanced / Aggressive / Ultra / Loucura (paper only)
- Loucura profile (paper-only stress mode):
  - high-frequency entries
  - timed exits
  - controlled martingale steps
- Execution feed with explicit statuses (BUY/SELL/REJECTED/risk blocks)
- Real wallet integration for visualization (`/api/wallet`)
- Manual mode/profile controls (`/api/mode`, `/api/profile`)
- API credentials save endpoint (`/api/credentials`)
- Paper reset endpoint (`/api/paper/reset`)
- Real-time dashboard (WS + polling fallback)

## Strategy Pack (Jarvis Trade)
- Production prompt: `strategy/JARVIS_TRADE_SYSTEM_PROMPT.md`
- Execution policy: `strategy/strategy-config.json`

Integrated in engine (`server.js`):
- gate by `minConfidence`, `minConfluence`, `minRR`
- risk clamped by `riskPerTradeMin/riskPerTradeMax`
- max consecutive losses from strategy config
- no-trade session window (00:00–02:59 UTC)

Recommended defaults:
- trade only when `confidence >= 80`
- `RR >= 1:1.5` (prefer `1:2`)
- at least `3` confluence factors
- otherwise: `WAIT` / `NO TRADE`

## Important
- Real execution remains guarded by policy checks.
- Loucura mode is intended for paper stress testing only.
