# Trading Strategy — Conservative Trend Follower (STARTER)

⚠️ WARNING: This is a default starter strategy. It is NOT proven or backtested. Replace this with your own strategy as soon as possible. This exists only to get you started.

## Rules

1. Only trade BTC and ETH — no altcoins until you customize this
2. Max leverage: 3x — no exceptions
3. Max risk per trade: 2% of capital — if your stop loss would lose more than 2%, reduce position size
4. Max open positions: 2 — one per asset max
5. Max drawdown: 10% — if total P&L drops below -10%, stop trading and alert me

## Entry Rules

- Only enter LONG positions (no shorts with this starter strategy)
- Entry signal: Price is above the 24h moving average AND the last 4 hours have been green (higher closes)
- Confirmation: Volume in the last hour is above the 24h average volume
- If both conditions are met, enter a long position at market price

## Exit Rules

- Stop Loss: 3% below entry price — non-negotiable, always set this immediately
- Take Profit: 6% above entry price (2:1 reward-to-risk)
- Trailing Stop: If price moves 4% in your favor, move stop to breakeven (entry price)
- Time Stop: If a position hasn't hit TP or SL after 48 hours, close it at market

## Position Sizing

- Risk amount = 2% of current equity
- Position size = Risk amount ÷ (Entry price × Stop loss %)
- Apply leverage (max 3x) to the position size
- Never risk more than 2% on a single trade

## What NOT To Do

- Don't chase — if you missed the move, wait for the next one
- Don't average down — if it's going against you, the stop loss handles it
- Don't overtrade — "no setup" is a valid decision every spawn
- Don't hold through major news events — close positions before known announcements
