#!/bin/bash
# spawn-nexo.sh - Invoca subagente Nexo para geração de ideia de negócio
# Executado via cron - modo session (persistente, independente da sessão main)
set -e

WORKSPACE="/root/.openclaw/workspace"
LOG_FILE="$WORKSPACE/logs/nexo-spawn.log"
OUTPUT_DIR="$WORKSPACE/ideias-negocio"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE=$(date '+%Y-%m-%d')

mkdir -p "$WORKSPACE/logs" "$OUTPUT_DIR"

echo "[$TIMESTAMP] Iniciando spawn do subagente Nexo..." >> "$LOG_FILE"

# Verifica se agente Nexo existe
if [ ! -f "/root/.openclaw/agents/nexo/agent.json" ]; then
    echo "[$TIMESTAMP] ERRO: Agente Nexo não encontrado" >> "$LOG_FILE"
    exit 1
fi

# Task para Nexo
TASK="Gere a IDEIA DO DIA para $(date '+%d/%m/%Y'). \
\nINSTRUÇÕES:\
1. Pesquise tendências atuais usando web_search/web_fetch (DuckDuckGo, Google Trends, etc.)\
2. Foque em: B2B SaaS, automação, produtividade, nichos específicos\
3. EVITE: trading bots, fintech, healthtech (regulação complexa)\
4. Valide: demanda real, concorrência viável, monetização clara\
\nFORMATO DE SAÍDA:\
💡 Ideia do Dia: [Nome]\
🎯 Problema: [Qual dor resolve]\
👥 Público: [Quem paga]\
💰 Monetização: [Modelo]\
🛠️ Stack: [Tecnologias]\
⏱️ MVP: [Tempo estimado]\
📈 Tendência: [Por que agora]\
\nSalve o resultado em: $OUTPUT_DIR/ideia-$DATE.md"

# Invoca subagente via openclaw sessions spawn (modo session = persistente)
if command -v openclaw &> /dev/null; then
    cd "$WORKSPACE"
    
    # Spawn com mode=session para persistência
    openclaw sessions spawn \
        --agent-id nexo \
        --mode session \
        --task "$TASK" \
        --timeout 600 \
        --label "nexo-ideia-$(date +%s)" \
        2>> "$LOG_FILE"
    
    RESULT=$?
    echo "[$TIMESTAMP] Subagente Nexo spawnado (exit: $RESULT)" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ERRO: openclaw CLI não disponível" >> "$LOG_FILE"
    exit 1
fi

echo "[$TIMESTAMP] Concluído" >> "$LOG_FILE"
