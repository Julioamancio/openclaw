#!/usr/bin/env bash
set -euo pipefail

PROFILE_RAW="${1:-default}"
PROFILE="$(echo "$PROFILE_RAW" | tr '[:upper:]' '[:lower:]')"

case "$PROFILE" in
  fast|default|guardian) ;;
  *)
    echo "Uso: $0 {fast|default|guardian}"
    exit 1
    ;;
esac

OUT="/root/.openclaw/workspace/SELF_IMPROVING_ACTIVE.md"
NOW_UTC="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

cat > "$OUT" <<EOF
# Self-Improving Active Profile

- Active: **${PROFILE^^}**
- Updated: ${NOW_UTC}

## Runtime directives
EOF

if [[ "$PROFILE" == "fast" ]]; then
cat >> "$OUT" <<'EOF'
- Reflection depth: low
- Max self-review passes: 1
- Memory writes: only critical repeated failures
- Response style: concise, action-first
- Use for: quick tasks and low-risk operations
EOF
fi

if [[ "$PROFILE" == "default" ]]; then
cat >> "$OUT" <<'EOF'
- Reflection depth: medium
- Max self-review passes: 1-2
- Memory writes: meaningful decisions and recurring lessons
- Response style: balanced clarity + speed
- Use for: daily engineering and automation work
EOF
fi

if [[ "$PROFILE" == "guardian" ]]; then
cat >> "$OUT" <<'EOF'
- Reflection depth: high
- Max self-review passes: 2+
- Memory writes: full risk/decision/mitigation trail
- Response style: rigorous, explicit trade-offs
- Use for: production, security, migration, irreversible changes
- Safety gate: require confirmation before sensitive/destructive actions
EOF
fi

echo "✅ Profile ativo: ${PROFILE^^}"
echo "📄 Estado: $OUT"
