# Second Brain — Memória Ativa do Mike

## Propósito

Este é o **segundo cérebro** do assistente. Armazena memórias, documentos importantes e tarefas que preciso lembrar entre sessões. Tudo aqui é **persistente** e faz parte do backup diário obrigatório.

## Estrutura de Dados

```
second-brain/
├── data/
│   ├── memories.json    # Memórias importantes (aprendizados, decisões)
│   ├── documents.json   # Documentos e referências
│   └── tasks.json       # Tarefas pendentes e concluídas
├── public/              # Assets estáticos
└── dist/               # Build estático (deploy)
```

## Como Usar

### Adicionar Memória

Edite `data/memories.json`:

```json
{
  "id": "4",
  "title": "Decisão sobre arquitetura",
  "content": "Optamos por usar PostgreSQL ao invés de MySQL...",
  "createdAt": "2026-02-20",
  "tags": ["decisão", "banco-de-dados", "importante"]
}
```

### Nova Tarefa

Edite `data/tasks.json`:

```json
{
  "id": "5",
  "title": "Revisar backup automático",
  "completed": false,
  "dueDate": "2026-02-22",
  "priority": "high"
}
```

### Novo Documento

Edite `data/documents.json`:

```json
{
  "id": "5",
  "title": "guia-otserver.md",
  "type": "markdown",
  "updatedAt": "2026-02-20",
  "size": "4.2 KB"
}
```

## Integração com Build

O build estático (`npm run build`) lê os JSONs em `data/` e gera as páginas HTML. Para atualizar o site: 1. Edite os JSONs em `data/` 2. Rode `npm run build` 3. Deploy `dist/`

## Backup

**Faz parte do backup diário obrigatório às 22:00.** Arquivos incluídos: - `data/*.json` (conteúdo) - `README.md` (este arquivo) - `dist/` (build estático opcional)

## Comandos

```bash
# Atualizar dados e rebuildar
npm run build

# Preview local
npx serve dist

# Desenvolvimento
npm run dev
```

---

*Este é o meu cérebro externo. Cuidado com o que apaga.*
