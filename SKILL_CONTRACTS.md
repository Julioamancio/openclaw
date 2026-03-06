# SKILL_CONTRACTS.md

Contratos mínimos para skills críticas (model-agnostic).

## Objetivo
Garantir comportamento consistente independente do modelo escolhido.

## Contrato padrão (para cada skill)
- **Input schema**: campos obrigatórios, opcionais, defaults
- **Output schema**: formato determinístico + status
- **Failure modes**: erros esperados e mensagens padrão
- **Side effects**: arquivos/serviços alterados
- **Safety gates**: quando exigir confirmação humana
- **Audit event**: evento JSONL obrigatório em `audit-log.jsonl`

## Skills críticas atuais

### 1) mission-control-ops
- Input: action, target, notes
- Output: { ok, action, changed_files[], alerts[] }
- Safety gate: alterações de gateway/firewall/high-risk
- Audit: `type=skill_exec`, `task=mission-control-ops`, `result`

### 2) auto-heal
- Input: incident message + id
- Output:
  - AUTOHEAL_TASK
  - AUTOHEAL_RESULT
  - AUTOHEAL_LEVEL
  - AUTOHEAL_MANUAL_REQUIRED
  - AUTOHEAL_NOTES
- Safety gate: risk high => confirmação humana
- Audit: `type=auto_heal`

### 3) dispatch-mc-alerts
- Input: fila de alertas pendentes
- Output: processamento + ack + postmortem
- Safety gate: high-risk sem aprovação não auto-executa
- Audit: `type=dispatch`

## Regra operacional
Qualquer nova skill de produção só entra após:
1. contrato definido neste arquivo
2. script com saída estável
3. teste de sucesso/falha
4. evento de auditoria habilitado
