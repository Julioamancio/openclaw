import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  await db.guideSendHistory.deleteMany();
  await db.installmentGuide.deleteMany();
  await db.declaration.deleteMany();
  await db.declarationType.deleteMany();
  await db.installmentType.deleteMany();
  await db.activityLog.deleteMany();
  await db.notification.deleteMany();
  await db.setting.deleteMany();
  await db.client.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);

  const users = await Promise.all([
    db.user.create({ data: { name: "Daniela Costa", email: "daniela@controlla.com", passwordHash, role: UserRole.ADMINISTRADOR } }),
    db.user.create({ data: { name: "Carlos Prado", email: "carlos@controlla.com", passwordHash, role: UserRole.CONTADOR } }),
    db.user.create({ data: { name: "Ana Ribeiro", email: "ana@controlla.com", passwordHash, role: UserRole.ASSISTENTE } }),
    db.user.create({ data: { name: "Ricardo Melo", email: "ricardo@controlla.com", passwordHash, role: UserRole.VISUALIZADOR } }),
  ]);

  const clients = await Promise.all([
    db.client.create({ data: { internalCode: "CLI-001", corporateName: "Alfa Comércio de Alimentos Ltda.", tradeName: "Alfa Alimentos", document: "12.345.678/0001-90", taxRegime: "Simples Nacional", stateRegistration: "123456789", municipalRegistration: "998877", primaryEmail: "financeiro@alfa.com.br", financialEmail: "boletos@alfa.com.br", phone: "(31) 3333-4444", whatsapp: "(31) 98888-1111", contactName: "Fernanda Almeida", city: "Belo Horizonte", state: "MG" } }),
    db.client.create({ data: { internalCode: "CLI-002", corporateName: "Beta Engenharia e Projetos S/A", tradeName: "Beta Engenharia", document: "23.456.789/0001-10", taxRegime: "Lucro Presumido", stateRegistration: "445566778", municipalRegistration: "110022", primaryEmail: "contato@beta.com.br", financialEmail: "fiscal@beta.com.br", phone: "(11) 4000-1111", whatsapp: "(11) 97777-2222", contactName: "Roberta Menezes", city: "São Paulo", state: "SP" } }),
    db.client.create({ data: { internalCode: "CLI-003", corporateName: "Clínica Vida Integral Ltda.", tradeName: "Vida Integral", document: "34.567.890/0001-55", taxRegime: "Lucro Real", stateRegistration: "Isento", municipalRegistration: "778899", primaryEmail: "adm@vidaintegral.com.br", financialEmail: "tesouraria@vidaintegral.com.br", phone: "(21) 3222-9999", whatsapp: "(21) 96666-3333", contactName: "João Carvalho", city: "Rio de Janeiro", state: "RJ" } }),
  ]);

  const defis = await db.declarationType.create({ data: { name: "DEFIS", sphere: "Federal" } });
  const dctf = await db.declarationType.create({ data: { name: "DCTF", sphere: "Federal" } });
  const efd = await db.declarationType.create({ data: { name: "EFD", sphere: "Estadual" } });

  const federal = await db.installmentType.create({ data: { name: "Parcelamento Federal" } });
  const estadual = await db.installmentType.create({ data: { name: "Parcelamento Estadual" } });

  await db.declaration.createMany({ data: [
    { clientId: clients[0].id, declarationTypeId: defis.id, competence: "02/2026", yearBase: 2026, dueDate: new Date("2026-03-12"), status: "Em andamento", priority: "Alta", ownerId: users[1].id, notes: "Aguardando fechamento final da folha." },
    { clientId: clients[1].id, declarationTypeId: dctf.id, competence: "02/2026", yearBase: 2026, dueDate: new Date("2026-03-08"), status: "Pendente", priority: "Crítica", ownerId: users[2].id, notes: "Cliente ainda não enviou XML complementar." },
    { clientId: clients[2].id, declarationTypeId: efd.id, competence: "01/2026", yearBase: 2026, dueDate: new Date("2026-03-05"), deliveredAt: new Date("2026-03-06"), status: "Entregue em atraso", priority: "Média", ownerId: users[0].id, protocol: "EFD-553881" },
  ]});

  const guide1 = await db.installmentGuide.create({ data: { clientId: clients[1].id, installmentTypeId: estadual.id, agency: "SEFAZ/SP", agreementNumber: "SP-33210", reference: "03/2026", installmentNumber: 4, amount: 1975.22, dueDate: new Date("2026-03-07"), issuedAt: new Date("2026-03-01"), sentAt: new Date("2026-03-02"), deliveryMethod: "WhatsApp", ownerId: users[2].id, status: "Vencido", paymentStatus: "Em aberto", notes: "Cliente visualizou, mas não confirmou pagamento." } });
  await db.installmentGuide.create({ data: { clientId: clients[0].id, installmentTypeId: federal.id, agency: "Receita Federal", agreementNumber: "PF-2026-0198", reference: "03/2026", installmentNumber: 8, amount: 4820.5, dueDate: new Date("2026-03-11"), issuedAt: new Date("2026-03-08"), deliveryMethod: "E-mail", ownerId: users[2].id, status: "Preparado para envio", paymentStatus: "Pendente" } });

  await db.guideSendHistory.create({ data: { guideId: guide1.id, sentAt: new Date("2026-03-02T14:00:00Z"), method: "WhatsApp", message: "Guia enviada ao financeiro do cliente." } });

  await db.activityLog.createMany({ data: [
    { userId: users[0].id, entityType: "declaration", entityId: "seed-1", action: "Editou declaração DEFIS", newValues: JSON.stringify({ status: "Em andamento" }) },
    { userId: users[2].id, entityType: "guide", entityId: guide1.id, action: "Preparou guia de parcelamento", newValues: JSON.stringify({ status: "Vencido" }) },
  ]});

  await db.setting.create({ data: { key: "office_name", value: "Controlla Fiscal" } });
}

main().finally(async () => db.$disconnect());
