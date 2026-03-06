# HEARTBEAT.md

## 📅 Agenda de Tarefas (Horários BRT / UTC)

| Tarefa | Horário BRT | Horário UTC | Agente |
|--------|-------------|-------------|--------|
| Check remetentes | 08:00 | 11:00 | Daniela |
| Ideia de Negócio | 09:00 | 12:00 | Nexo |
| Check remetentes | 16:00 | 19:00 | Daniela |
| Backup GitHub | 22:00 | 01:00+1 | Sistema |

---

## Backup Diário (22:00 America/Sao_Paulo)
Executar todo dia às 22:00:
1. Forçar perfil **GUARDIAN**: `/root/.openclaw/workspace/scripts/auto-self-improving-profile.sh backup`
2. Verificar se há alterações no workspace
3. Verificar se há alterações no second-brain/data/
4. Commit com formato: `backup(chatgpt): YYYY-MM-DD HH:mm -03`
5. Push para main

### Arquivos de Backup
**Root:**
- AGENTS.md
- SOUL.md
- USER.md
- IDENTITY.md
- TOOLS.md
- MEMORY.md
- HEARTBEAT.md
- memory/*.md

**Second Brain:**
- second-brain/data/*.json
- second-brain/README.md
- second-brain/*.md (se houver)

### Comando de Backup
```bash
cd /root/.openclaw/workspace
# Salvar dados do Second Brain se necessário
# (rebuild se houver mudanças no data/)
# Commit e push
git add -A
git commit -m "backup(chatgpt): $(date '+%Y-%m-%d %H:%M') -03" || echo "Nada para commitar"
git push origin main || echo "Push falhou"
```

---

## Verificações Periódicas (Heartbeat)
- [ ] **Perfil Self-Improving (auto):** `/root/.openclaw/workspace/scripts/auto-self-improving-profile.sh heartbeat`
- [ ] **Gateway:** `openclaw gateway status`
- [ ] **Disco:** `df -h /`
- [ ] **E-mails não lidos** (Gmail pessoal + profissional) — check SIMPLES: há não lidos? (Sim/Não)
  - [ ] **Remetentes específicos** — SÓ às 08:00 e 16:00 BRT (11:00 e 19:00 UTC)
- [ ] **Ideia de Negócio** — SÓ às 09:00 BRT (12:00 UTC)
- [ ] **Second Brain:** estado dos dados em `/root/.openclaw/workspace/second-brain/data/`
- [ ] **Exceções Mission Control:** executar `/root/.openclaw/workspace/scripts/dispatch-mc-alerts.sh`; se houver saída com alertas, enviar resumo no Telegram (já ACK automático)

---

## Monitoramento de E-mails Específicos
**Horários:** 08:00 e 16:00 BRT (11:00 e 19:00 UTC)
**Ação:** Verificar se há e-mails novos dos remetentes monitorados
**Output:** Enviar via Telegram lista de quem enviou + assunto

### Remetentes Monitorados
- carlos.fonseca@colegiosantoantonio.com.br
- caroline.xavier@colegiosantoantonio.com.br
- fernanda.campos@colegiosantoantonio.com.br
- fernanda.horta@colegiosantoantonio.com.br
- ivana.pinheiro@colegiosantoantonio.com.br
- julio.amancio@colegiosantoantonio.com.br
- natalia.mendes@colegiosantoantonio.com.br
- renata.bahia@colegiosantoantonio.com.br
- secretaria@csjbh.com.br
- juliana.furtado@csjbh.com.br

### Comando de Verificação
```bash
/root/.openclaw/workspace/scripts/check-emails.sh
```

### Check de E-mails
```bash
# Usa credenciais locais de .env.local
/root/.openclaw/workspace/scripts/check-emails.sh
```

---
## Auto-Alternância de Perfil (Self-Improving)
Script:
```bash
/root/.openclaw/workspace/scripts/auto-self-improving-profile.sh [contexto]
```

### Regras automáticas
- **Contexto crítico** (`backup`, `deploy`, `migration`, `security`, etc.) → `GUARDIAN`
- **Contexto rápido** (`quick`, `fast`, `chat`, `trivial`) → `FAST`
- **Sem contexto especial:**
  - 11:00–22:59 UTC → `DEFAULT`
  - 23:00–10:59 UTC → `FAST`

### Exemplos
```bash
# No heartbeat
/root/.openclaw/workspace/scripts/auto-self-improving-profile.sh heartbeat

# Antes de backup/deploy
/root/.openclaw/workspace/scripts/auto-self-improving-profile.sh backup
/root/.openclaw/workspace/scripts/auto-self-improving-profile.sh deploy
```

Estado atual do perfil:
- `/root/.openclaw/workspace/SELF_IMPROVING_ACTIVE.md`

---
## Ideia de Negócio Diária 💡
**Horário:** 09:00 BRT (12:00 UTC) - SEPARADO do check de remetentes
**Objetivo:** Sugerir 1 ideia de app, webservice ou SaaS rentável

### Processo de Pesquisa:
1. **Tendências:** Google Trends (BR + Global), Product Hunt, Indie Hackers
2. **Validação:** Verificar se há demanda real, concorrência, viabilidade
3. **Análise:** Nicho + monetização + stack técnica + MVP

### Output Esperado:
```
💡 Ideia do Dia: [Nome do Projeto]

🎯 Problema: [Qual dor resolve]
👥 Público: [Quem paga]
💰 Monetização: [Modelo de receita]
🛠️ Stack: [Tecnologias sugeridas]
⏱️ MVP: [Tempo estimado]
📈 Tendência: [Por que agora é bom momento]
```

### Exclusão de Use Cases:
- Nada de trading bots já saturados
- Nada que precise de regulamentação complexa (fintech, healthtech)
- Foco em B2B SaaS, automação, produtividade, nichos específicos
