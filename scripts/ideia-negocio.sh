#!/bin/bash
# ideia-negocio.sh - Gera ideia de negocio diaria via subagente Nexo
# Executado via cron: 0 12 * * * (12:00 UTC / 09:00 BRT)

set -e

WORKSPACE="/root/.openclaw/workspace"
LOG_FILE="$WORKSPACE/logs/ideia-negocio.log"
mkdir -p "$WORKSPACE/logs"

echo "[$(date)] Iniciando geração de ideia de negócio..." >> "$LOG_FILE"

# Verifica se subagente existe
if [ ! -f "$WORKSPACE/../agents/nexo/agent.json" ]; then
    echo "[$(date)] ERRO: Subagente Nexo não encontrado" >> "$LOG_FILE"
    exit 1
fi

# Envia mensagem para subagente Nexo
MESSAGE="Gere a ideia de negócio do dia. Hoje é $(date '+%Y-%m-%d'). \
Pesquise tendências atuais em B2B SaaS, automação e produtividade. \
Priorize nichos com demanda real viável."

# Usa sessions_spawn para chamar o subagente
if command -v openclaw &> /dev/null; then
    cd "$WORKSPACE"
    openclaw sessions spawn \
        --agent-id nexo \
        --mode run \
        --task "$MESSAGE" \
        --timeout 300 \
        --cleanup delete 2>&1 >> "$LOG_FILE" || echo "[$(date)] Aviso: subagente pode ter falhado" >> "$LOG_FILE"
fi

echo "[$(date)] Ideia de negócio concluída." >> "$LOG_FILE"
