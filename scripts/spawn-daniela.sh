#!/bin/bash
# spawn-daniela.sh - Invoca subagente Daniela para monitoramento de emails
# Executado via cron - modo session (persistente, independente da sessão main)
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

# Invoca subagente via openclaw sessions spawn (modo session = persistente)
if command -v openclaw &> /dev/null; then
    cd "$WORKSPACE"
    
    # Usa sessions_spawn com mode=session para persistência
    # O resultado vai para o file descriptor 3 que capturamos
    openclaw sessions spawn \
        --agent-id daniela \
        --mode session \
        --task "$TASK" \
        --timeout 180 \
        --label "daniela-email-check-$(date +%s)" \
        2>> "$LOG_FILE"
    
    RESULT=$?
    echo "[$TIMESTAMP] Subagente Daniela spawnado (exit: $RESULT)" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ERRO: openclaw CLI não disponível" >> "$LOG_FILE"
    exit 1
fi

echo "[$TIMESTAMP] Concluído" >> "$LOG_FILE"
