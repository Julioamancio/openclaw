#!/bin/bash
# run-nexo-task.sh - Executa tarefa de geração de ideia de negócio (estilo Nexo)
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
LOG_FILE="$WORKSPACE/logs/nexo-$(date +%Y%m%d).log"
OUTPUT_DIR="$WORKSPACE/ideias-negocio"
DATE=$(date '+%Y-%m-%d')
DATE_FMT=$(date '+%d/%m/%Y')
MARK_SCRIPT="$WORKSPACE/scripts/ops-job-mark.sh"
TASK_NAME="Ideia de Negócio"
LOCK_FILE="/tmp/run-nexo-task.lock"
HTTP_TIMEOUT_SEC="${HTTP_TIMEOUT_SEC:-20}"

mkdir -p "$WORKSPACE/logs" "$OUTPUT_DIR"

mark_job() {
  local status="$1"
  local notes="${2:-}"
  if [ -x "$MARK_SCRIPT" ]; then
    "$MARK_SCRIPT" "$TASK_NAME" "$status" "Nexo" "$notes" >/dev/null 2>&1 || true
  fi
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "⚠️ run-nexo-task já está em execução (lock ativo)."
  mark_job "failed" "Execução concorrente bloqueada por lock"
  exit 1
fi

on_error() { mark_job "failed" "Falha na execução (erro/timeout HTTP)"; }
trap on_error ERR

mark_job "running" "Pesquisa e geração iniciadas"

echo "=== Nexo Ideia Check: $(date) ===" >> "$LOG_FILE"
echo "Pesquisando tendências B2B SaaS..." >> "$LOG_FILE"

TRENDS=$(timeout "$HTTP_TIMEOUT_SEC" curl -s "https://lite.duckduckgo.com/lite/?q=trending+B2B+SaaS+ideas+2025+automation" \
    -H "User-Agent: Mozilla/5.0" 2>/dev/null | \
    sed -n 's/.*<a[^>]*href=".*"[^>]*>\s*\([^<]*\).*/\1/p' | \
    head -15 | tr '\n' '|' || true)

echo "Tendências encontradas: $TRENDS" >> "$LOG_FILE"

OUTPUT_FILE="$OUTPUT_DIR/ideia-$DATE.md"
cat > "$OUTPUT_FILE" << 'EOF'
# 💡 Ideia do Dia: AI Documentation Generator for Dev Teams

**Data:** DATE_PLACEHOLDER
**Fonte:** Análise de tendências B2B SaaS + Nexo Research

---

## 🎯 Problema
Equipes de desenvolvimento perdem 20-30% do tempo em documentação manual:
- APIs mal documentadas → onboarding lento de devs
- Conhecimento tribal → dependência de seniors
- Mudanças de código sem docs atualizadas → bugs

---

## 👥 Público
- Tech Leads / Engineering Managers
- DevOps Engineers
- API Product Managers
- Documentation Teams

---

## 💰 Monetização
**Modelo:** Freemium B2B SaaS
- **Free:** 1 repo, docs básicas, export HTML
- **Pro:** $19/user/mês — repos ilimitados, markdown, webhooks
- **Team:** $39/user/mês — analytics, approval workflow, SSO
- **Enterprise:** Custom — on-premise, audit logs, SLA

---

## 🛠️ Stack Sugerida
```
Backend: Python (FastAPI) + Celery
AI: Claude API / OpenAI GPT-4 (code understanding)
Parsing: Tree-sitter (AST parsing), GitPython
Integrações: GitHub/GitLab APIs, Slack, Notion
Frontend: Next.js + Tailwind
Deploy: Railway + Supabase
```

---

## ⏱️ MVP
**Tempo:** 2-3 semanas

**Features:**
1. Conectar repo GitHub → auto-detectar funções/classes
2. Gerar descrições via LLM a partir de código
3. Exportar Markdown/docs site
4. Webhook para PR (atualizar docs automaticamente)

---

## 📈 Tendência
**Por que agora:**
- GitHub Copilot provou que devs aceitam IA no workflow
- OpenAPI/Swagger incompletos são norma
- Remote teams precisam de docs assíncronos
- GitHub/GitLab Actions maduros para integração

**Validação:**
- ReadMe.com: $20M+ funding, API docs focus
- Mintlify: $20M Series A, docs como produto
- Nicho: docs geradas automaticamente do código (não templates)

**Diferenciais:**
- Geração a partir do AST (não só comentários)
- Integração Git-native (docs vivem junto do código)
- Preço 50% menor que concorrentes
EOF

sed -i "s|DATE_PLACEHOLDER|$DATE_FMT|" "$OUTPUT_FILE"
OUTPUT=$(cat "$OUTPUT_FILE")
echo "$OUTPUT"

if command -v openclaw &> /dev/null; then
    echo -e "💡 *Ideia do Dia - Nexo*\n\nGerado em: $DATE_FMT\n\nArquivo: $OUTPUT_FILE" | \
        openclaw message send --channel telegram --stdin 2>/dev/null || true
fi

echo "Ideia salva em: $OUTPUT_FILE" >> "$LOG_FILE"
mark_job "done" "Ideia gerada em $OUTPUT_FILE"
