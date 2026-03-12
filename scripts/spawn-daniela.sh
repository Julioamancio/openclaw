#!/bin/bash
# spawn-daniela.sh - Invoca o agente Daniela para monitoramento de emails
# Executado via cron usando a CLI compatível com esta versão do OpenClaw
set -e

WORKSPACE="/root/.openclaw/workspace"
LOG_FILE="$WORKSPACE/logs/daniela-spawn.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$WORKSPACE/logs"

echo "[$TIMESTAMP] Iniciando spawn do subagente Daniela..." >> "$LOG_FILE"

# Verifica se agente Daniela existe
if [ ! -f "/root/.openclaw/agents/daniela/agent.json" ]; then
    echo "[$TIMESTAMP] ERRO: Agente Daniela não encontrado" >> "$LOG_FILE"
    exit 1
fi

# Task para Daniela
TASK="Verifique emails de remetentes monitorados. \
Horário: $(date '+%H:%M %d/%m/%Y'). \
Contas: julioamancio2014@gmail.com (pessoal) e julio.amancio@colegiosantoantonio.com.br (CSA). \
Remetentes monitorados: carlos.fonseca, caroline.xavier, fernanda.campos, fernanda.horta, ivana.pinheiro, natalia.mendes, renata.bahia, secretaria@csjbh.com.br, juliana.furtado@csjbh.com.br. \
Para cada email novo, reporte: remetente, assunto, hora. \
Se não houver emails, confirme 'Nenhum email novo'."

# Invoca Daniela via `openclaw agent`, compatível com a CLI atual.
if command -v openclaw &> /dev/null; then
    cd "$WORKSPACE"

    openclaw agent \
        --agent daniela \
        --message "$TASK" \
        --timeout 180 \
        --deliver \
        --reply-channel telegram \
        --reply-to telegram:720093594 \
        >> "$LOG_FILE" 2>&1

    RESULT=$?
    echo "[$TIMESTAMP] Agente Daniela executado (exit: $RESULT)" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ERRO: openclaw CLI não disponível" >> "$LOG_FILE"
    exit 1
fi

echo "[$TIMESTAMP] Concluído" >> "$LOG_FILE"
