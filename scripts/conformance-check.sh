#!/bin/bash
set -euo pipefail

WORKSPACE="/root/.openclaw/workspace"
OUT_JSON="$WORKSPACE/eval/conformance-report.json"
OUT_MD="$WORKSPACE/eval/conformance-report.md"

cd "$WORKSPACE"

python3 - "$OUT_JSON" "$OUT_MD" <<'PY'
import json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

out_json, out_md = sys.argv[1:3]
checks = []


def add(id_, ok, notes=''):
    checks.append({"id": id_, "ok": bool(ok), "notes": notes})

# JSON parse checks
json_files = [
    'policies.json',
    'runbooks.json',
    'model-router.json',
    'risk-policy.json',
    'capabilities.json'
]
for p in json_files:
    try:
        json.loads(Path(p).read_text(encoding='utf-8'))
        add(f'json:{p}', True)
    except Exception as e:
        add(f'json:{p}', False, f'invalid json: {e}')

# Required key checks
try:
    p = json.loads(Path('policies.json').read_text(encoding='utf-8'))
    add('schema:policies.rules', isinstance(p.get('rules'), list), 'rules must be array')
except Exception:
    pass

try:
    rb = json.loads(Path('runbooks.json').read_text(encoding='utf-8'))
    add('schema:runbooks.tasks', isinstance(rb.get('tasks'), dict), 'tasks must be object')
except Exception:
    pass

try:
    router = json.loads(Path('model-router.json').read_text(encoding='utf-8'))
    add('schema:model-router.routes', isinstance(router.get('routes'), list), 'routes must be array')
except Exception:
    pass

# Shell syntax checks for critical scripts
shell_targets = [
    'scripts/policy-check.sh',
    'scripts/eval-harness.sh',
    'scripts/promote-if-green.sh',
    'scripts/mission-exec.sh'
]
for s in shell_targets:
    proc = subprocess.run(['bash', '-n', s], capture_output=True, text=True)
    add(f'shell:{s}', proc.returncode == 0, (proc.stderr or proc.stdout).strip())

# Node syntax check
proc = subprocess.run(['node', '--check', 'server.js'], capture_output=True, text=True)
add('node:server.js', proc.returncode == 0, (proc.stderr or proc.stdout).strip())

passed = sum(1 for c in checks if c['ok'])
total = len(checks)
score = round((passed / total) * 100) if total else 0
gate = 'pass' if score >= 90 else 'fail'

report = {
    'generatedAt': datetime.now(timezone.utc).isoformat(),
    'total': total,
    'passed': passed,
    'score': score,
    'gate': gate,
    'results': checks,
}

Path(out_json).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
md = [
    '# Conformance Report',
    f"- generatedAt: {report['generatedAt']}",
    f"- total: {total}",
    f"- passed: {passed}",
    f"- score: {score}",
    f"- gate: **{gate}**",
    '',
    '## Checks'
]
for c in checks:
    md.append(f"- {'✅' if c['ok'] else '❌'} {c['id']}{(' — ' + c['notes']) if c['notes'] else ''}")
Path(out_md).write_text('\n'.join(md) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
PY
