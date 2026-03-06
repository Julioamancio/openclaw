#!/bin/bash
# backup.sh — Backup diário obrigatório (22:00 America/Sao_Paulo)
# Executado via cron ou heartbeat

set -e

WORKSPACE="/root/.openclaw/workspace"
SECOND_BRAIN="$WORKSPACE/second-brain"
DATE=$(date '+%Y-%m-%d %H:%M')
TZ="-03"

cd "$WORKSPACE" || exit 1

echo "[$(date)] Iniciando backup diário..."
[ -x "$WORKSPACE/scripts/ops-job-mark.sh" ] && "$WORKSPACE/scripts/ops-job-mark.sh" "Backup GitHub" "running" "Sistema" "Backup iniciado" || true

# Força perfil GUARDIAN para operação crítica de backup/push
if [ -x "$WORKSPACE/scripts/auto-self-improving-profile.sh" ]; then
    PROFILE_SELECTED=$($WORKSPACE/scripts/auto-self-improving-profile.sh backup 2>/dev/null || echo "guardian")
    echo "Perfil self-improving aplicado para backup: ${PROFILE_SELECTED^^}"
fi

# Ao finalizar (sucesso/erro), retorna perfil + registra job no Mission Control
restore_profile() {
    if [ -x "$WORKSPACE/scripts/auto-self-improving-profile.sh" ]; then
        RESTORED=$($WORKSPACE/scripts/auto-self-improving-profile.sh heartbeat 2>/dev/null || true)
        if [ -n "$RESTORED" ]; then
            echo "Perfil self-improving restaurado após backup: ${RESTORED^^}"
        fi
    fi
}

on_exit() {
    EXIT_CODE=$?
    if [ "$EXIT_CODE" -eq 0 ]; then
        [ -x "$WORKSPACE/scripts/ops-job-mark.sh" ] && "$WORKSPACE/scripts/ops-job-mark.sh" "Backup GitHub" "done" "Sistema" "Backup executado com sucesso" || true
    else
        [ -x "$WORKSPACE/scripts/ops-job-mark.sh" ] && "$WORKSPACE/scripts/ops-job-mark.sh" "Backup GitHub" "failed" "Sistema" "Backup falhou (exit $EXIT_CODE)" || true
    fi
    restore_profile
}
trap on_exit EXIT

# Verificar e adicionar changes no Second Brain
if [ -d "$SECOND_BRAIN" ]; then
    echo "Verificando Second Brain..."
    cd "$SECOND_BRAIN"
    # Rebuild se necessário (simplificado)
    if git diff --name-only | grep -q "topics/"; then
        echo "Dados do Second Brain alterados, rebuildando..."
        npm run build 2>/dev/null || echo "Build não executado (node_modules pode estar faltando)"
    fi
    cd "$WORKSPACE"
fi

# Adicionar todos os arquivos
# Inclui: *.md, memory/, second-brain/topics/
git add AGENTS.md SOUL.md USER.md IDENTITY.md TOOLS.md MEMORY.md HEARTBEAT.md README.md 2>/dev/null || true
git add memory/ 2>/dev/null || true
git add second-brain/topics/ 2>/dev/null || true
git add second-brain/README.md 2>/dev/null || true

# Gate de segurança: bloquear push com segredos staged
SECURITY_ISSUE=0
if git diff --cached --name-only | grep -E '(^|/)\.env(\.|$)|secrets\.env|(^|/)id_rsa|(^|/)\.pem$|(^|/)\.p12$' >/dev/null 2>&1; then
    echo "❌ Segurança: arquivo sensível staged detectado (.env/secrets/key). Abortando backup."
    git diff --cached --name-only | grep -E '(^|/)\.env(\.|$)|secrets\.env|(^|/)id_rsa|(^|/)\.pem$|(^|/)\.p12$' || true
    SECURITY_ISSUE=1
fi

if git diff --cached | grep -E 'GMAIL_.*APP_PASSWORD|APP_PASSWORD=|GITHUB_RECOVERY_KEY=|Authorization: Bearer|BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY' >/dev/null 2>&1; then
    echo "❌ Segurança: padrão de segredo detectado no conteúdo staged. Abortando backup."
    SECURITY_ISSUE=1
fi

if [ "$SECURITY_ISSUE" -ne 0 ]; then
    echo "Backup interrompido pelo gate de segurança."
    exit 1
fi

# Commit se houver mudanças
if git diff --cached --quiet; then
    echo "Nada para commitar."
else
    git commit -m "backup(chatgpt): $DATE $TZ"
    echo "Commit criado: backup(chatgpt): $DATE $TZ"
fi

# Push se houver commits para push
if git rev-parse --abbrev-ref HEAD@{upstream} >/dev/null 2>&1; then
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{upstream})
    BASE=$(git merge-base @ @{upstream})

    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "Repositório está sincronizado."
    elif [ "$LOCAL" = "$BASE" ]; then
        echo "Existem mudanças no remote. Puxando..."
        git pull --rebase || echo "Pull falhou"
    else
        echo "Enviando push..."
        git push origin main 2>/dev/null && echo "Push concluído com sucesso" || echo "Push falhou ou nada para enviar"
    fi
else
    echo "Nenhum upstream configurado. Configurar com: git push -u origin main"
fi

echo "[$(date)] Backup diário concluído."
