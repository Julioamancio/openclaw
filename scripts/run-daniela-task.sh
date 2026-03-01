#!/bin/bash
# run-daniela-task.sh - Executa tarefa de monitoramento de emails (estilo Daniela)
# Roda independentemente, sem depender de subagente
set -e

WORKSPACE="/root/.openclaw/workspace"
LOG_FILE="$WORKSPACE/logs/daniela-$(date +%Y%m%d).log"
RESULT_FILE="$WORKSPACE/logs/daniela-last-result.txt"

mkdir -p "$WORKSPACE/logs"

echo "=== Daniela Email Check: $(date) ===" >> "$LOG_FILE"

# Contas e senhas
 declare -A ACCOUNTS
ACCOUNTS["julioamancio2014@gmail.com"]="REDACTED_GMAIL_PERSONAL_APP_PASSWORD|PESSOAL"
ACCOUNTS["julio.amancio@colegiosantoantonio.com.br"]="REDACTED_GMAIL_CSA_APP_PASSWORD|CSA"

# Remetentes monitorados
SENDERS=(
    "carlos.fonseca@colegiosantoantonio.com.br"
    "caroline.xavier@colegiosantoantonio.com.br"
    "fernanda.campos@colegiosantoantonio.com.br"
    "fernanda.horta@colegiosantoantonio.com.br"
    "ivana.pinheiro@colegiosantoantonio.com.br"
    "natalia.mendes@colegiosantoantonio.com.br"
    "renata.bahia@colegiosantoantonio.com.br"
    "secretaria@csjbh.com.br"
    "juliana.furtado@csjbh.com.br"
)

RESULTS=""
FOUND=0

for account in "${!ACCOUNTS[@]}"; do
    IFS="|" read -r password label <<< "${ACCOUNTS[$account]}"
    
    echo "Checking: $label" >> "$LOG_FILE"
    
    # Check unread emails
    response=$(echo -e "a LOGIN $account '$password'\na SELECT INBOX\na SEARCH UNSEEN\na LOGOUT" | \
        openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null)
    
    msg_ids=$(echo "$response" | grep "^\\* SEARCH" | grep -v "SEARCH$" | sed 's/.*SEARCH //')
    
    if [ -n "$msg_ids" ] && [ "$msg_ids" != " " ]; then
        # Fetch headers for each message
        for msg_id in $msg_ids; do
            header_response=$(echo -e "a LOGIN $account '$password'\na SELECT INBOX\na FETCH $msg_id BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)]\na LOGOUT" | \
                openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null)
            
            from=$(echo "$header_response" | grep -i "^From:" | sed 's/^From: //i' | tr -d '\r' | head -1)
            subject=$(echo "$header_response" | grep -i "^Subject:" | sed 's/^Subject: //i' | tr -d '\r' | head -1)
            
            # Check if sender is in monitored list
            for sender in "${SENDERS[@]}"; do
                if echo "$from" | grep -qi "$sender"; then
                    RESULTS="${RESULTS}📧 *$label*: $from\n   _Assunto: $subject_\n\n"
                    FOUND=$((FOUND + 1))
                    echo "  Found: $from - $subject" >> "$LOG_FILE"
                    break
                fi
            done
        done
    fi
done

# Generate output
if [ $FOUND -gt 0 ]; then
    OUTPUT="📧 *Monitor de Emails - Daniela*\n\n$RESULTS\n_$(date '+%d/%m/%Y %H:%M')_"
else
    OUTPUT="📧 *Monitor de Emails - Daniela*\n\n✅ Nenhum email novo dos remetentes monitorados.\n\n_$(date '+%d/%m/%Y %H:%M')_"
fi

echo -e "$OUTPUT" > "$RESULT_FILE"
echo "$OUTPUT"

# Send via Telegram if available
if command -v openclaw &> /dev/null; then
    echo -e "$OUTPUT" | openclaw message send --channel telegram --stdin 2>/dev/null || true
fi

echo "[$FOUND emails encontrados]" >> "$LOG_FILE"
