# 🤖 Mike - Assistente Pessoal OpenClaw

Repositório de configuração do assistente AI pessoal ([@Julioamancio](https://github.com/Julioamancio)), nomeado **Mike** (codename: Jarvis-Prime).

---

## 📋 Sobre

Este workspace contém a configuração completa de um agente AI operando via [OpenClaw](https://github.com/openclaw/openclaw), com integração ao Telegram e preparação para Discord. O assistente foi projetado com foco em automação, monitoramento de infraestrutura e produtividade.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│  Telegram (Interface do Usuário)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  OpenClaw Gateway (Loopback:127.0.0.1)  │
│  Porta: 18789                           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Agent "Mike" (main)                   │
│  • Automação de tarefas                 │
│  • Monitoramento de sistemas            │
│  • Integração com APIs externas         │
└─────────────────────────────────────────┘
```

---

## 📂 Estrutura do Workspace

### Root Files

| Arquivo | Descrição |
|---------|-----------|
| `AGENTS.md` | Convenções e protocolos para o agente operar |
| `SOUL.md` | Identidade e comportamento do agente (Mike/Jarvis-Prime) |
| `USER.md` | Perfil do usuário - Julio (Julião) |
| `IDENTITY.md` | Identidade técnica e camadas operacionais |
| `TOOLS.md` | Configurações locais (e-mail, credenciais, aliases) |
| `HEARTBEAT.md` | Checklist de verificações periódicas |
| `MEMORY.md` | Memória de longo prazo (curados, não carregada em grupos) |

### Diretórios

```
├── memory/           # Logs diários (YYYY-MM-DD.md)
├── scripts/          # Scripts de automação
│   └── check-emails.sh
└── second-brain/     # Second Brain app (Next.js)
    ├── data/         # Dados persistentes (JSON)
    │   ├── documents.json
    │   ├── memories.json
    │   ├── tasks.json
    │   └── email-monitor.json
    └── ...
```

---

## 🤖 Configuração de Modelos (AI Providers)

### Modelo Principal
- **Provider:** NVIDIA-NIM
- **Modelo:** `nvidia-nim/moonshotai/kimi-k2.5`

### Fallback Automático
**Fallback padrão:** `openai-codex/gpt-5.3-codex`

Se o NVIDIA-NIM Kimi falhar, o sistema cai automaticamente para o Codex 5.3 via OAuth (já configurado no ambiente). Não requer intervenção manual.

---

## 💬 Operação Discord (Runbook)

### Objetivo
Manter o Mike/Jarvis-Prime operando também como assistente no Discord, sem perder contexto operacional.

### Workspace/Canal alvo
- **Servidor (Guild ID):** `922103561603645502`
- **Canal principal (Destruitor OTServer):** `922103562052452363`
- **Link de referência:** `https://discord.com/channels/922103561603645502/922103562052452363`

### Checklist de continuidade
1. Verificar se o canal Discord está habilitado no OpenClaw (`channels.discord.enabled = true`).
2. Confirmar que o bot está no servidor e com permissões do canal.
3. Garantir que o bot tenha ao menos:
   - View Channels
   - Send Messages
   - Read Message History
   - Embed Links
   - Add Reactions
4. Se falhar autenticação, renovar token no Discord Developer Portal e atualizar config local.
5. Reiniciar gateway após mudança de credenciais/config.

### Comandos úteis
```bash
openclaw gateway status
openclaw status
openclaw gateway restart
```

### Notas de segurança
- **Não** armazenar token do bot em README, commits ou mensagens públicas.
- Guardar credenciais apenas no arquivo de configuração/local env do OpenClaw.

## 🔧 Funcionalidades Implementadas

### 1. 📧 Monitoramento de E-mails (IMAP)

> Segurança: credenciais IMAP foram movidas para `.env.local` (não versionado).

**Descrição:** Verificação automatizada de e-mails não lidos de remetentes específicos.

**Contas monitoradas:**
- Gmail Pessoal: `julioamancio2014@gmail.com`
- Gmail Profissional (CSA): `julio.amancio@colegiosantoantonio.com.br`

**Remetentes monitorados (10):**
1. `carlos.fonseca@colegiosantoantonio.com.br`
2. `caroline.xavier@colegiosantoantonio.com.br`
3. `fernanda.campos@colegiosantoantonio.com.br`
4. `fernanda.horta@colegiosantoantonio.com.br`
5. `ivana.pinheiro@colegiosantoantonio.com.br`
6. `julio.amancio@colegiosantoantonio.com.br`
7. `natalia.mendes@colegiosantoantonio.com.br`
8. `renata.bahia@colegiosantoantonio.com.br`
9. `secretaria@csjbh.com.br`
10. `juliana.furtado@csjbh.com.br` ✅

**Agendamento:** 2x ao dia (08:00 e 16:00 BRT / 11:00 e 19:00 UTC)

**Script:** [`scripts/check-emails.sh`](scripts/check-emails.sh)

**Configuração:** [`second-brain/data/email-monitor.json`](second-brain/data/email-monitor.json)

---

### 2. 💾 Backup Diário

**Descrição:** Backup automático do workspace para o GitHub.

**Horário:** 22:00 America/Sao_Paulo

**Novo fluxo de segurança (self-improving):**
1. Força perfil `GUARDIAN` no início do backup
2. Executa commit/push normalmente
3. Restaura perfil automático de heartbeat ao finalizar

**Scripts envolvidos:**
- [`scripts/backup.sh`](scripts/backup.sh)
- [`scripts/auto-self-improving-profile.sh`](scripts/auto-self-improving-profile.sh)
- [`scripts/set-self-improving-profile.sh`](scripts/set-self-improving-profile.sh)

**Arquivos incluídos:**
- AGENTS.md, SOUL.md, USER.md, IDENTITY.md
- TOOLS.md, MEMORY.md, HEARTBEAT.md
- memory/*.md
- second-brain/data/*.json
- Scripts e configs gerais

**Formato do commit:** `backup(chatgpt): YYYY-MM-DD HH:mm -03`

---

### 3. 🔍 Verificações de Heartbeat

Checklist executado em heartbeats periódicos:

- [x] **Perfil Self-Improving (auto):** seleção por contexto/horário
- [x] **Gateway:** Status do OpenClaw gateway
- [x] **Disco:** Espaço em disco (`df -h /`)
- [x] **E-mails:** Verificação de não lidos
- [x] **Second Brain:** Estado dos dados

**Configuração:** [`HEARTBEAT.md`](HEARTBEAT.md)

---

### 4. 🧠 Second Brain (Aplicação Next.js)

Sistema de gerenciamento de conhecimento pessoal:

- **Memórias:** Armazenamento de insights e aprendizados
- **Documentos:** Gestão de documentos relevantes
- **Tarefas:** Acompanhamento de atividades

**Tecnologia:** TypeScript, Next.js, Tailwind CSS

---

### 5. 🖥️ Mission Control Dashboard (HTML único + Server local)

Painel premium local para operação diária, com persistência local e backup no servidor Node.

**Frontend:** [`mission-control.html`](mission-control.html)

**Backend local:** [`server.js`](server.js) (porta `8899`)

**Persistência local/server:**
- `localStorage` (camada primária)
- `mc-data.json` (backup de estado)
- `mc-activity.json` (log de atividades)

**Abas implementadas:**
- 📊 Painel (métricas, atividade, prioridades)
- 📋 Projetos (kanban)
- 📅 Roadmap
- 📝 Notas
- 💰 Receita (MRR, clientes, projeções)
- 🏢 Command Center (agentes/subagentes + decisões executivas)
- 🎬 YouTube (pipeline, growth tracker, calendário)
- 📞 Meetings (upcoming/past, agenda, notas, ações)
- 📡 Intel (categorias, filtros, daily brief)
- 🧭 Ops (crons/tarefas diárias, OTServer, execuções por agentes)

**Integrações do Mission Control com servidor local:**
- `GET /mc/data` no load com merge (server backup + localStorage primário)
- `POST /mc/data` a cada 5 minutos (backup automático)
- `GET /mc/weather?city=Belo Horizonte/MG` no header
- `POST /mc/activity` em mudanças de dados
- `GET /mc/jobs` para status real de jobs/scripts no painel Ops
- `GET /mc/alerts` + `POST /mc/alerts/ack` para fila de exceções
- `GET /mc/otserver` para health check OTServer (7171/7172)
- Indicador visual de conectividade (`Server: Online/Offline`)

**Auto-start macOS (opcional):**
- Template: [`com.missioncontrol.server.plist`](com.missioncontrol.server.plist)

---

## 🛡️ Segurança

### Guardian Layer (Camada de Proteção)

O agente ativa proteção automática para:

- Configuração do OpenClaw (gateway, auth)
- Deployments críticos (OTServer)
- Firewall VPS (portas expostas: 80, 8080, 9090, 7171, 7172)
- Docker networking & bind rules
- Comandos de deleção/migração
- Rotinas de backup/recovery GitHub

**Política:** Nunca executar ações destrutivas sem confirmação explícita.

---

## 👤 Perfil do Usuário

**Nome:** Julio ("Julião")

**Perfil Técnico:**
- English professor + builder
- Infrastructure operator (Ubuntu/VPS/Hostinger)
- AI orchestrator (multi-provider routing)
- OTServer/Tibia infraestrutura
- Criação/avaliação acadêmica

**Valores:** Estabilidade, controle, velocidade, clareza, reprodutibilidade

**Idioma:** Português (Brasil) / Inglês para código/docs

---

## 🤖 Perfil do Agente (Mike/Jarvis-Prime)

**Arquétipo:** Technical Jarvis (Strategic AI Operator)

**Missão:** Converter complexidade em execução estável, automatizada e pronta para produção.

**Diretriz:** Proteger sistemas core. Amplificar output. Minimizar fricção.

**Protocolo de Comunicação:**
- Idioma padrão: Português
- Código/Infra/Prompts: Inglês
- Tom: Composed, confident, técnico (nunca teatral)
- Regra do terminal: Um passo por vez

**Camadas Operacionais:**
1. 🛡 Guardian Layer (risk-aware)
2. 🧩 Architect Layer (systems design)
3. ⚙️ Engineer Layer (implementation)
4. 📊 Optimizer Layer (cost/performance)
5. 🧠 Strategic Advisor Layer (trade-offs/roadmap)

---

## 🚀 Comandos Rápidos

```bash
# Status do Gateway
openclaw gateway status

# Checar e-mails manualmente
./scripts/check-emails.sh

# Commit de backup manual
git add -A
git commit -m "backup(chatgpt): $(date '+%Y-%m-%d %H:%M') -03"
git push origin main

# Ver espaço em disco
df -h /
```

---

## 📡 Integrações

| Serviço | Uso |
|---------|-----|
| **Telegram** | Canal principal de comunicação |
| **Gmail (IMAP)** | Monitoramento de e-mails (2 contas) |
| **GitHub** | Backup do workspace |
| **Hostinger VPS** | Infraestrutura do OpenClaw |

---

## 📊 Status Atual

| Componente | Status |
|------------|--------|
| Gateway OpenClaw | ✅ Running (127.0.0.1:18789) |
| Monitoramento de E-mails | ✅ Ativo (10 remetentes) |
| Backup Diário | ✅ Configurado (22:00, com GUARDIAN auto) |
| Self-Improving Profiles | ✅ Fast / Default / Guardian + auto-switch |
| Second Brain | ✅ Operational |
| Heartbeat Checks | ✅ Programado |
| Mission Control Ops (SLO/L3/Auto-heal) | ✅ Ativo |

---

## 📒 Operações Contínuas

- Changelog operacional automático: [`OPERATIONS_CHANGELOG.md`](OPERATIONS_CHANGELOG.md)
- Atualização diária automática via cron (`scripts/auto-doc-ops.sh`)

## 📝 Notes

- **Heartbeat Mode:** O agente realiza checks periódicos automaticamente
- **Memory Management:** Daily logs em `memory/YYYY-MM-DD.md`, memória-longa em `MEMORY.md`
- **Security:** credenciais IMAP/segredos locais em `.env.local` (não versionado)
- **Updates:** Commits automáticos formato `backup(chatgpt): ...`

---

## 🔐 Atualização de Segurança (2026-03-05)

Mudanças aplicadas após revisão de segurança:

- Segredos removidos de arquivos versionados (`TOOLS.md` e `HEARTBEAT.md` já sem senhas em claro)
- Fluxo de e-mail padronizado via `scripts/check-emails.sh` + `.env.local`
- Template de ambiente adicionado: `.env.local.example`
- Histórico Git sanitizado e `main` reescrito com force-push
- Branch de recuperação criada: `backup/pre-sanitize-20260305-222330`

> Nota operacional: rotação final das credenciais (Google App Passwords / token GitHub) deve ser concluída no ambiente do operador.

---

## 🆕 Atualizações Operacionais (2026-03-06)

### Lote 2 (operação inteligente)
- Risk Scoring Engine (`risk-policy.json` + `scripts/risk-score.sh`)
- High-risk approval endpoint no Mission Control (`POST /mc/high-risk/approve`)
- Janela de aprovação + reescalonamento (`scripts/high-risk-window-guard.sh`)
- Health Score 0–100 com card no painel e guard de threshold (`/mc/health-score` + `scripts/health-score-guard.sh`)
- Runbook A/B learning com exploração controlada e métrica de duração média (`runbooks.json` + `scripts/auto-heal.sh`)
- Detecção de anomalia por horário (`scripts/anomaly-hourly-guard.sh`)
- Audit trail estruturado (`audit-log.jsonl` + `scripts/audit-event.sh`)
- Auto-documentação contínua (`OPERATIONS_CHANGELOG.md` + `scripts/auto-doc-ops.sh`)
- Model Router inicial (model-agnostic): `model-router.json` + `scripts/model-route.sh`
- Orquestrador de roteamento com trilha de auditoria: `scripts/router-exec.sh`
- Métricas por modelo + fallback automático por degradação: `router-metrics.json` + `scripts/router-metrics-update.sh`
- Contratos de skill para consistência cross-model: `SKILL_CONTRACTS.md`
- Router inteligente com métricas e fallback por degradação (latência + fail streak)


- Auto-heal em 3 níveis (L1/L2/L3) com fallback para intervenção manual
- Runbook registry com aprendizagem por taxa de sucesso (`runbooks.json`)
- Escalonamento L3 com SLA e roteamento on-call (`oncall-map.json` + `escalate-l3-open.sh`)
- Dispatch de alertas com lock/timeout + criação automática de postmortem
- `check-emails.sh` blindado contra travamento (lock + timeout IMAP + cleanup órfão)
- Resumo executivo diário automático via Telegram (`daily-executive-summary.sh`)
- Tendências SLO 7d/30d + ranking de runbooks no Mission Control

## 🔗 Links

- [Documentação OpenClaw](https://docs.openclaw.ai)
- [Repositório OpenClaw](https://github.com/openclaw/openclaw)
- [ClawHub - Skills](https://clawhub.com)

---

*Última atualização: 2026-03-06*

*Maintainer: Mike (Jarvis-Prime) via OpenClaw*
