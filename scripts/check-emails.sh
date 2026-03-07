#!/bin/bash
# Check e-mails de remetentes específicos - com timeout/lock anti-travamento
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
ENV_FILE="$WORKSPACE/.env.local"
MARK_SCRIPT="$WORKSPACE/scripts/ops-job-mark.sh"
TASK_NAME="Check remetentes"
LOCK_FILE="/tmp/check-emails.lock"
IMAP_TIMEOUT_SEC="${IMAP_TIMEOUT_SEC:-4}"
MAX_RUNTIME_SEC="${MAX_RUNTIME_SEC:-70}"
SCRIPT_START_EPOCH="$(date +%s)"

mark_job() {
  local status="$1"
  local notes="${2:-}"
  if [ -x "$MARK_SCRIPT" ]; then
    "$MARK_SCRIPT" "$TASK_NAME" "$status" "Daniela" "$notes" >/dev/null 2>&1 || true
  fi
}

# lock para evitar sobreposição de execuções
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "⚠️ check-emails já está em execução (lock ativo)."
  mark_job "failed" "Execução concorrente bloqueada por lock"
  exit 1
fi

# limpa openssl órfão antigo (best effort)
pkill -f "openssl s_client -connect imap.gmail.com:993 -crlf -quiet" >/dev/null 2>&1 || true

on_error() {
  mark_job "failed" "Falha na execução (erro/timeout IMAP)"
}
trap on_error ERR

mark_job "running" "Verificação iniciada"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

GMAIL_CSA_EMAIL="${GMAIL_CSA_EMAIL:-}"
GMAIL_CSA_APP_PASSWORD="${GMAIL_CSA_APP_PASSWORD:-}"

if [ -z "$GMAIL_CSA_EMAIL" ] || [ -z "$GMAIL_CSA_APP_PASSWORD" ]; then
  echo "❌ Variáveis ausentes: GMAIL_CSA_EMAIL / GMAIL_CSA_APP_PASSWORD"
  echo "   Configure em: $ENV_FILE"
  mark_job "failed" "Variáveis de ambiente ausentes"
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

gen_tag() {
  echo "a$(date +%s%N | tail -c 4)"
}

imap_query() {
  local payload="$1"
  timeout "$IMAP_TIMEOUT_SEC" sh -c "printf '%b' \"$payload\" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null" || true
}

check_account() {
  local email="$1"
  local pass="$2"
  local label="$3"
  local found_any=0

  for sender in "${SENDERS[@]}"; do
    local now elapsed
    now=$(date +%s)
    elapsed=$((now - SCRIPT_START_EPOCH))
    if [ "$elapsed" -ge "$MAX_RUNTIME_SEC" ]; then
      echo "⚠️ Tempo limite da verificação atingido (${elapsed}s). Encerrando de forma segura."
      break
    fi

    local tag1 tag2 tag3
    tag1=$(gen_tag)
    tag2=$(gen_tag)
    tag3=$(gen_tag)

    local cmd="${tag1} LOGIN ${email} \"${pass}\"\r\n"
    cmd+="${tag2} SELECT INBOX\r\n"
    cmd+="${tag3} SEARCH UNSEEN FROM \"${sender}\"\r\n"

    local response
    response=$(imap_query "$cmd" | grep "^\\* SEARCH" || true)

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

        local header_cmd="${t1} LOGIN ${email} \"${pass}\"\r\n"
        header_cmd+="${t2} SELECT INBOX\r\n"
        header_cmd+="${t3} FETCH ${first_id} BODY.PEEK[HEADER.FIELDS (SUBJECT)]\r\n"

        local subject
        subject=$(imap_query "$header_cmd" | grep -i "^Subject:" | sed 's/Subject: //i' | head -1 || true)
        echo "   Assunto: ${subject:-(sem assunto)}"
      fi
    fi
  done

  return $found_any
}

result=$(check_account "$GMAIL_CSA_EMAIL" "$GMAIL_CSA_APP_PASSWORD" "CSA" || true)

if [ -n "$result" ]; then
  found_count=$(printf "%s\n" "$result" | grep -c '^📧' || true)
  echo -e "📬 *Novos e-mails de remetentes monitorados:*\n\n$result"
  mark_job "done" "${found_count} remetentes com novos e-mails"
else
  echo "✅ Nenhum e-mail novo de remetentes monitorados."
  mark_job "done" "Nenhum e-mail novo"
fi
