#!/bin/bash
# Check e-mails de remetentes específicos - 2x ao dia (8h e 16h)
# Não lê o conteúdo, só quem enviou e o assunto

SENDERS=(
  "carlos.fonseca@colegiosantoantonio.com.br"
  "caroline.xavier@colegiosantoantonio.com.br"
  "fernanda.campos@colegiosantoantonio.com.br"
  "fernanda.horta@colegiosantoantonio.com.br"
  "ivana.pinheiro@colegiosantoantonio.com.br"
  "julio.amancio@colegiosantoantonio.com.br"
  "natalia.mendes@colegiosantoantonio.com.br"
  "renata.bahia@colegiosantoantonio.com.br"
  "secretaria@csjbh.com.br"
)

check_unread() {
  local email=$1
  local password=$2
  local account_name=$3
  
  local results=""
  
  for sender in "${SENDERS[@]}"; do
    # Buscar e-mails não lidos de cada remetente
    local cmd=$(cat <<EOF
a LOGIN $email $password
a SELECT INBOX
a SEARCH UNSEEN FROM "$sender"
a LOGOUT
EOF
)
    local response=$(echo -e "$cmd" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null)
    local msg_ids=$(echo "$response" | grep "^\* SEARCH" | grep -v "SEARCH\$" | sed 's/.*SEARCH //')
    
    if [ -n "$msg_ids" ] && [ "$msg_ids" != " " ]; then
      # Há mensagens, pegar headers (FROM e SUBJECT)
      for msg_id in $msg_ids; do
        header_cmd=$(cat <<EOF
a LOGIN $email $password
a SELECT INBOX
a FETCH $msg_id BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)]
a LOGOUT
EOF
)
        header_response=$(echo -e "$header_cmd" | openssl s_client -connect imap.gmail.com:993 -crlf -quiet 2>/dev/null)
        from=$(echo "$header_response" | grep -i "^From:" | sed 's/^From: //i' | tr -d '\r')
        subject=$(echo "$header_response" | grep -i "^Subject:" | sed 's/^Subject: //i' | tr -d '\r')
        results="${results}${account_name}: ${from} - ${subject}\n"
      done
    fi
  done
  
  echo -e "$results"
}

# Verificar ambas as contas
output=""
output+=$(check_unread "julioamancio2014@gmail.com" "stpp\\ eqxo\\ ddbl\\ yfae" "PESSOAL")
output+=$(check_unread "julio.amancio@colegiosantoantonio.com.br" "ambt\\ mdan\\ pqjn\\ lffb" "CSA")

# Enviar resultado se houver e-mails
if [ -n "$output" ]; then
  echo -e "📧 *Novos e-mails de remetentes monitorados:*\n\n$output"
else
  echo "✅ Nenhum e-mail novo de remetentes monitorados."
fi
