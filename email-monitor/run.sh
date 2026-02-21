#!/bin/bash
# Email Monitor Runner - Executado via cron
# Horários: 08:00 e 16:00 America/Sao_Paulo

SCRIPT_DIR="/root/.openclaw/workspace/email-monitor"
LOG_FILE="$SCRIPT_DIR/last-run.log"
RESULT_FILE="$SCRIPT_DIR/last-result.txt"

cd "$SCRIPT_DIR" || exit 1

# Executa o script e captura saída completa
OUTPUT=$(python3 check_emails.py 2>&1)
EXIT_CODE=$?

# Salva log completo
echo "=== Run: $(date) ===" > "$LOG_FILE"
echo "$OUTPUT" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Extrai a mensagem formatada para Telegram
MESSAGE=$(echo "$OUTPUT" | sed -n '/📧 \*Monitor de Emails\*/,/^={50,}$/p' | sed '$d')

# Se não conseguiu extrair, cria mensagem padrão
if [ -z "$MESSAGE" ]; then
    MESSAGE="📧 *Monitor de Emails*

Nenhum email dos remetentes monitorados nas últimas 12h.

_$(date '+%d/%m/%Y %H:%M')_"
fi

# Salva resultado
 echo "$MESSAGE" > "$RESULT_FILE"

# Tenta enviar para Telegram via OpenClaw (se disponível)
if command -v openclaw &> /dev/null; then
    # Usa o próprio OpenClaw para enviar a mensagem
    cd /root/.openclaw/workspace
    echo "$MESSAGE" | /usr/bin/openclaw message send --channel telegram --stdin 2>/dev/null
fi

# Log simples
echo "[$(date)] Email check completed (exit: $EXIT_CODE)" >> /root/.openclaw/workspace/logs/email-monitor.log 2>/dev/null || true

exit $EXIT_CODE
