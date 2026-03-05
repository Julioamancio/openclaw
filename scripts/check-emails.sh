#!/bin/bash
# Check e-mails de remetentes específicos - versão simplificada (sem segredo hardcoded)
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
ENV_FILE="$WORKSPACE/.env.local"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

GMAIL_CSA_EMAIL="${GMAIL_CSA_EMAIL:-}"
GMAIL_CSA_APP_PASSWORD="REDACTED"

if [ -z "$GMAIL_CSA_EMAIL" ] || [ -z "$GMAIL_CSA_APP_PASSWORD" ]; then
  echo "❌ Variáveis ausentes: GMAIL_CSA_EMAIL / GMAIL_CSA_APP_PASSWORD"
  echo "   Configure em: $ENV_FILE"
  exit 1
fi

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

# Função para log único
gen_tag() {
  echo "a$(date +%s%N | tail -c 4)"
}

# Verificar e-mails para uma conta
check_account() {
  local email="$1"
  local pass="$2"
  local label="$3"
  local found_any=0

  for sender in "${SENDERS[@]}"; do
    local tag1 tag2 tag3
    tag1=$(gen_tag)
    tag2=$(gen_tag)
    tag3=$(gen_tag)

    # Buscar não lidos de um remetente específico
    local cmd="${tag1} LOGIN ${email} ${pass}\r\n"
    cmd+="${tag2} SELECT INBOX\r\n"
    cmd+="${tag3} SEARCH UNSEEN FROM \"${sender}\"\r\n"

    local response
    response=$(printf "%b" "$cmd" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null | grep "^\\* SEARCH" || true)

    if echo "$response" | grep -qv "SEARCH$"; then
      local msg_ids
      msg_ids=$(echo "$response" | sed 's/.*SEARCH //;s/[^0-9 ]//g' | tr ' ' '\n' | grep -v '^$' || true)

      if [ -n "$msg_ids" ]; then
        found_any=1
        echo "📧 [$label] Novo de: ${sender}"

        local first_id t1 t2 t3
        first_id=$(echo "$msg_ids" | head -1)
        t1=$(gen_tag)
        t2=$(gen_tag)
        t3=$(gen_tag)

        local header_cmd="${t1} LOGIN ${email} ${pass}\r\n"
        header_cmd+="${t2} SELECT INBOX\r\n"
        header_cmd+="${t3} FETCH ${first_id} BODY.PEEK[HEADER.FIELDS (SUBJECT)]\r\n"

        local subject
        subject=$(printf "%b" "$header_cmd" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null | grep -i "^Subject:" | sed 's/Subject: //i' | head -1 || true)
        echo "   Assunto: ${subject:-(sem assunto)}"
      fi
    fi
  done

  return $found_any
}

# === EXECUÇÃO PRINCIPAL ===
result=$(check_account "$GMAIL_CSA_EMAIL" "$GMAIL_CSA_APP_PASSWORD" "CSA" || true)

if [ -n "$result" ]; then
  echo -e "📬 *Novos e-mails de remetentes monitorados:*\n\n$result"
else
  echo "✅ Nenhum e-mail novo de remetentes monitorados."
fi
