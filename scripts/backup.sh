#!/bin/bash
# backup.sh — Backup diário obrigatório (22:00 America/Sao_Paulo)
# Executado via cron ou heartbeat

set -e

WORKSPACE="/root/.openclaw/workspace"
SECOND_BRAIN="$WORKSPACE/second-brain"
DATE=$(date '+%Y-%m-%d %H:%M')
TZ="-03"

cd "$WORKSPACE" || exit 1

echo "[$(date)] Iniciando backup diário..."

# Verificar e adicionar changes no Second Brain
if [ -d "$SECOND_BRAIN" ]; then
    echo "Verificando Second Brain..."
    cd "$SECOND_BRAIN"
    # Rebuild se necessário (simplificado)
    if git diff --name-only | grep -q "topics/"; then
        echo "Dados do Second Brain alterados, rebuildando..."
        npm run build 2>/dev/null || echo "Build não executado (node_modules pode estar faltando)"
    fi
    cd "$WORKSPACE"
fi

# Adicionar todos os arquivos
# Inclui: *.md, memory/, second-brain/topics/
git add AGENTS.md SOUL.md USER.md IDENTITY.md TOOLS.md MEMORY.md HEARTBEAT.md 2>/dev/null || true
git add memory/ 2>/dev/null || true
git add second-brain/topics/ 2>/dev/null || true
git add second-brain/README.md 2>/dev/null || true

# Commit se houver mudanças
if git diff --cached --quiet; then
    echo "Nada para commitar."
else
    git commit -m "backup(chatgpt): $DATE $TZ"
    echo "Commit criado: backup(chatgpt): $DATE $TZ"
fi

# Push se houver commits para push
if git rev-parse --abbrev-ref HEAD@{upstream} >/dev/null 2>&1; then
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{upstream})
    BASE=$(git merge-base @ @{upstream})

    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "Repositório está sincronizado."
    elif [ "$LOCAL" = "$BASE" ]; then
        echo "Existem mudanças no remote. Puxando..."
        git pull --rebase || echo "Pull falhou"
    else
        echo "Enviando push..."
        git push origin main && echo "Push concluído com sucesso" || echo "Push falhou"
    fi
else
    echo "Nenhum upstream configurado. Configurar com: git push -u origin main"
fi

echo "[$(date)] Backup diário concluído."
