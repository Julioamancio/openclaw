# Conformance Report
- generatedAt: 2026-03-06T20:25:07.872130+00:00
- total: 13
- passed: 13
- score: 100
- gate: **pass**

## Checks
- ✅ json:policies.json
- ✅ json:runbooks.json
- ✅ json:model-router.json
- ✅ json:risk-policy.json
- ✅ json:capabilities.json
- ✅ schema:policies.rules — rules must be array
- ✅ schema:runbooks.tasks — tasks must be object
- ✅ schema:model-router.routes — routes must be array
- ✅ shell:scripts/policy-check.sh
- ✅ shell:scripts/eval-harness.sh
- ✅ shell:scripts/promote-if-green.sh
- ✅ shell:scripts/mission-exec.sh
- ✅ node:server.js
