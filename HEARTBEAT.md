# HEARTBEAT.md

## Backup Diário (22:00 America/Sao_Paulo)
Executar todo dia às 22:00:
1. Verificar se há alterações no workspace
2. Verificar se há alterações no second-brain/data/
3. Commit com formato: `backup(chatgpt): YYYY-MM-DD HH:mm -03`
4. Push para main

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
- [ ] **Gateway:** `openclaw gateway status`
- [ ] **Disco:** `df -h /`
- [ ] **E-mails não lidos** (Gmail pessoal + profissional) — check SIMPLES: há não lidos? (Sim/Não)
  - [ ] **Remetentes específicos** — SÓ às 08:00 e 16:00 BRT (não rolar em heartbeats fora desses horários)
- [ ] **Second Brain:** estado dos dados em `/root/.openclaw/workspace/second-brain/data/`

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

### Check de E-mails
```bash
# Gmail pessoal - não lidos
echo -e "a login julioamancio2014@gmail.com 'REDACTED_GMAIL_PERSONAL_APP_PASSWORD'\na select inbox\na search unseen\na logout" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null | grep "^\\* SEARCH" | grep -v "SEARCH$" && echo "[GMAIL PESSOAL] Há e-mails não lidos!" || echo "[GMAIL PESSOAL] Caixa de entrada limpa."

# Gmail profissional (CSA) - não lidos
echo -e "a login julio.amancio@colegiosantoantonio.com.br 'REDACTED_GMAIL_CSA_APP_PASSWORD'\na select inbox\na search unseen\na logout" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null | grep "^\\* SEARCH" | grep -v "SEARCH$" && echo "[GMAIL CSA] Há e-mails não lidos!" || echo "[GMAIL CSA] Caixa de entrada limpa."
```
