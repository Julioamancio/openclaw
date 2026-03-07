# NEXUS TRADE COMMAND (trade-copilot)

Painel e motor de trading com modos (lento/conservador/rápido/turbo/ultra), operação paper/real, controle de risco e telemetria.

## Principais recursos

- Dashboard Binance-like responsivo
- Botões de modo: `slow`, `conservative`, `fast`, `turbo`, `ultra`
- Aba **API** para:
  - alternar ambiente TESTE/REAL
  - inserir/limpar API key + secret
  - configurar branding (white-label)
- Auto-bot 24/7 com supervisor + systemd
- Estratégia adaptativa com:
  - filtros de RR e volatilidade
  - consenso multi-timeframe
  - bloqueio de estratégia ruim no curto prazo
  - camada de aprendizado online (peso por regime+estratégia)
- Métricas no painel: winrate, PnL, equity, expectancy, profit factor, max drawdown

## Segurança de segredos

As credenciais ficam em arquivo local fora do repo:

- `/root/.openclaw/workspace/.env.trading`

`trade-copilot/.env` é legado e sem segredos.

## Serviços systemd (user)

- `trade-copilot-server.service`
- `trade-copilot-bot.service`

Comandos úteis:

```bash
systemctl --user status trade-copilot-server trade-copilot-bot
systemctl --user restart trade-copilot-server trade-copilot-bot
journalctl --user -u trade-copilot-server -f
journalctl --user -u trade-copilot-bot -f
```

## URL

- Dashboard: `http://<host>:8090/`
- API/Admin: `http://<host>:8090/api.html`
