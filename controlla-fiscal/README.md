# Controlla Fiscal

Web app SaaS para escritórios de contabilidade com foco em declarações, guias de parcelamento, rastreabilidade e produtividade operacional.

## Stack base
- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma + PostgreSQL (schema inicial incluso)

## Escopo atual entregue
- Login
- Dashboard executivo
- Clientes / detalhe do cliente
- Declarações
- Guias de parcelamento
- Central de pendências
- Relatórios
- Auditoria
- Usuários
- Configurações
- Dados mock realistas
- Arquitetura pronta para evolução

## Rodar
```bash
cd controlla-fiscal
npm run dev
```

## Próximos passos de produto
1. Autenticação real com RBAC
2. API modular por domínio
3. Prisma Client + migrations
4. Upload de anexos
5. Exportações PDF/Excel/CSV
6. Alertas automáticos e notificações
7. Integrações com e-mail/WhatsApp/portal do cliente
