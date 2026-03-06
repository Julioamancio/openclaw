# MEMORY.md

## 2026-03-05 — Lições Operacionais (Self-Improving + Backup + Heartbeat)

1. **Perfil dinâmico supera perfil fixo**
   - Fast / Default / Guardian por contexto e horário reduz custo sem perder qualidade.

2. **Operações críticas devem forçar GUARDIAN**
   - Backup/deploy/security precisam entrar em modo rigoroso automaticamente.

3. **Automação crítica deve ter restauração de estado**
   - `backup.sh` entra em GUARDIAN e restaura perfil no fim (`trap EXIT`).

4. **Heartbeat deve orquestrar comportamento**
   - Além de checks técnicos, ajusta perfil operacional automaticamente.

5. **Documentação precisa refletir runtime real**
   - README + HEARTBEAT atualizados junto com scripts para evitar drift.

6. **Precisão textual é parte da confiança operacional**
   - Erros em listas monitoradas (ex.: remetentes) geram ruído e desconfiança.

## Estado atual consolidado
- Perfis disponíveis: `fast`, `default`, `guardian`
- Seletor manual: `scripts/set-self-improving-profile.sh`
- Seletor automático: `scripts/auto-self-improving-profile.sh`
- Estado ativo: `SELF_IMPROVING_ACTIVE.md`
- Backup noturno: força `guardian` no início e restaura perfil padrão ao final.
