# 🤖 Mike - Assistente Pessoal OpenClaw

Repositório de configuração do assistente AI pessoal ([@Julioamancio](https://github.com/Julioamancio)), nomeado **Mike** (codename: Jarvis-Prime).

---

## 📋 Sobre

Este workspace contém a configuração completa de um agente AI operando via [OpenClaw](https://github.com/openclaw/openclaw), com integração ao Telegram para comunicação direta. O assistente foi projetado com foco em automação, monitoramento de infraestrutura e produtividade.

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

## 🔧 Funcionalidades Implementadas

### 1. 📧 Monitoramento de E-mails (IMAP)

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
| Backup Diário | ✅ Configurado (22:00) |
| Second Brain | ✅ Operational |
| Heartbeat Checks | ✅ Programado |

---

## 📝 Notes

- **Heartbeat Mode:** O agente realiza checks periódicos automaticamente
- **Memory Management:** Daily logs em `memory/YYYY-MM-DD.md`, memória-longa em `MEMORY.md`
- **Security:** Credenciais em `TOOLS.md` (não versionado em produção)
- **Updates:** Commits automáticos formato `backup(chatgpt): ...`

---

## 🔗 Links

- [Documentação OpenClaw](https://docs.openclaw.ai)
- [Repositório OpenClaw](https://github.com/openclaw/openclaw)
- [ClawHub - Skills](https://clawhub.com)

---

*Última atualização: 2026-02-22*

*Maintainer: Mike (Jarvis-Prime) via OpenClaw*
