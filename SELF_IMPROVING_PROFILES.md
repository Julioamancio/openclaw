# Self-Improving Profiles

Perfis prontos para usar com a skill `self-improving`.

## 1) FAST (mínimo custo)
- Reflexão: curta (1 checklist de 3 itens)
- Memória: só erro crítico recorrente
- Escrita em memória: no máximo 1 entrada por tarefa
- Uso recomendado: tarefas rápidas, suporte operacional, respostas curtas

### Regras
- Validar apenas: precisão factual, risco, completude mínima
- Sem segunda rodada de revisão (a menos que risco alto)
- Evitar explicações longas

---

## 2) DEFAULT (equilíbrio)
- Reflexão: padrão (checklist + ajuste final)
- Memória: erros recorrentes + decisões relevantes
- Escrita em memória: 1-2 entradas quando houver aprendizado real
- Uso recomendado: desenvolvimento, automações, troubleshooting comum

### Regras
- Validar: precisão, risco, trade-offs
- Uma rodada de autoajuste antes da resposta final
- Priorizar clareza e ação

---

## 3) GUARDIAN (máximo rigor)
- Reflexão: profunda (diagnóstico + plano + validação)
- Memória: registrar decisões, riscos, mitigação e lições
- Escrita em memória: completa para auditoria
- Uso recomendado: produção, infraestrutura crítica, segurança, mudanças irreversíveis

### Regras
- Verificação explícita de risco e rollback
- Checagem de suposições + pontos de falha
- Nunca executar ação sensível sem confirmação quando aplicável

---

## Ativação rápida
Use o script:

```bash
/root/.openclaw/workspace/scripts/set-self-improving-profile.sh fast
/root/.openclaw/workspace/scripts/set-self-improving-profile.sh default
/root/.openclaw/workspace/scripts/set-self-improving-profile.sh guardian
```

Arquivo de estado atual:
- `/root/.openclaw/workspace/SELF_IMPROVING_ACTIVE.md`
