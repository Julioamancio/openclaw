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

## Verificações Periódicas (Opcional)

- [ ] Verificar se o gateway está rodando: `openclaw gateway status`
- [ ] Verificar espaço em disco
- [ ] Verificar estado do Second Brain
