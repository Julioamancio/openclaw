export type Role = "ADMINISTRADOR" | "CONTADOR" | "ASSISTENTE" | "VISUALIZADOR";

export type DeclarationStatus =
  | "Pendente"
  | "Em andamento"
  | "Aguardando documentos do cliente"
  | "Revisão interna"
  | "Entregue"
  | "Entregue em atraso"
  | "Cancelado";

export type GuideStatus =
  | "Não enviado"
  | "Preparado para envio"
  | "Enviado ao cliente"
  | "Reenviado"
  | "Confirmado pelo cliente"
  | "Pendente de retorno"
  | "Vencido"
  | "Pago";

export type Priority = "Baixa" | "Média" | "Alta" | "Crítica";

export const users = [
  { id: "u1", name: "Marina Costa", email: "marina@controlla.com", role: "ADMINISTRADOR" as Role, avatar: "MC" },
  { id: "u2", name: "Carlos Prado", email: "carlos@controlla.com", role: "CONTADOR" as Role, avatar: "CP" },
  { id: "u3", name: "Ana Ribeiro", email: "ana@controlla.com", role: "ASSISTENTE" as Role, avatar: "AR" },
  { id: "u4", name: "Ricardo Melo", email: "ricardo@controlla.com", role: "VISUALIZADOR" as Role, avatar: "RM" },
];

export const clients = [
  {
    id: "c1",
    code: "CLI-001",
    corporateName: "Alfa Comércio de Alimentos Ltda.",
    tradeName: "Alfa Alimentos",
    document: "12.345.678/0001-90",
    taxRegime: "Simples Nacional",
    stateRegistration: "123456789",
    municipalRegistration: "998877",
    primaryEmail: "financeiro@alfa.com.br",
    financialEmail: "boletos@alfa.com.br",
    phone: "(31) 3333-4444",
    whatsapp: "(31) 98888-1111",
    contact: "Fernanda Almeida",
    city: "Belo Horizonte",
    state: "MG",
    status: "Ativo",
  },
  {
    id: "c2",
    code: "CLI-002",
    corporateName: "Beta Engenharia e Projetos S/A",
    tradeName: "Beta Engenharia",
    document: "23.456.789/0001-10",
    taxRegime: "Lucro Presumido",
    stateRegistration: "445566778",
    municipalRegistration: "110022",
    primaryEmail: "contato@beta.com.br",
    financialEmail: "fiscal@beta.com.br",
    phone: "(11) 4000-1111",
    whatsapp: "(11) 97777-2222",
    contact: "Roberta Menezes",
    city: "São Paulo",
    state: "SP",
    status: "Ativo",
  },
  {
    id: "c3",
    code: "CLI-003",
    corporateName: "Clínica Vida Integral Ltda.",
    tradeName: "Vida Integral",
    document: "34.567.890/0001-55",
    taxRegime: "Lucro Real",
    stateRegistration: "Isento",
    municipalRegistration: "778899",
    primaryEmail: "adm@vidaintegral.com.br",
    financialEmail: "tesouraria@vidaintegral.com.br",
    phone: "(21) 3222-9999",
    whatsapp: "(21) 96666-3333",
    contact: "João Carvalho",
    city: "Rio de Janeiro",
    state: "RJ",
    status: "Ativo",
  },
  {
    id: "c4",
    code: "CLI-004",
    corporateName: "Delta Transportes e Logística Ltda.",
    tradeName: "Delta Log",
    document: "45.678.901/0001-66",
    taxRegime: "Simples Nacional",
    stateRegistration: "101010101",
    municipalRegistration: "556677",
    primaryEmail: "fiscal@deltalog.com.br",
    financialEmail: "parcelamentos@deltalog.com.br",
    phone: "(41) 3555-8888",
    whatsapp: "(41) 95555-4444",
    contact: "Sabrina Lopes",
    city: "Curitiba",
    state: "PR",
    status: "Ativo",
  },
];

export const declarationTypes = ["DASN", "DEFIS", "DCTF", "EFD", "SPED Fiscal", "SPED Contribuições", "DIRF", "RAIS", "IRPJ"];
export const installmentTypes = ["Parcelamento Federal", "Parcelamento Estadual", "Parcelamento Municipal", "Transação Tributária"];

export const declarations = [
  {
    id: "d1",
    clientId: "c1",
    type: "DEFIS",
    competence: "02/2026",
    yearBase: 2026,
    dueDate: "2026-03-12",
    deliveredAt: null,
    status: "Em andamento" as DeclarationStatus,
    owner: "Carlos Prado",
    priority: "Alta" as Priority,
    protocol: null,
    notes: "Aguardando fechamento final da folha.",
  },
  {
    id: "d2",
    clientId: "c2",
    type: "DCTF",
    competence: "02/2026",
    yearBase: 2026,
    dueDate: "2026-03-08",
    deliveredAt: null,
    status: "Pendente" as DeclarationStatus,
    owner: "Ana Ribeiro",
    priority: "Crítica" as Priority,
    protocol: null,
    notes: "Cliente ainda não enviou XML complementar.",
  },
  {
    id: "d3",
    clientId: "c3",
    type: "SPED Fiscal",
    competence: "01/2026",
    yearBase: 2026,
    dueDate: "2026-03-05",
    deliveredAt: "2026-03-06",
    status: "Entregue em atraso" as DeclarationStatus,
    owner: "Marina Costa",
    priority: "Média" as Priority,
    protocol: "SPED-553881",
    notes: "Entrega realizada com 1 dia de atraso por retificação do inventário.",
  },
  {
    id: "d4",
    clientId: "c4",
    type: "EFD",
    competence: "02/2026",
    yearBase: 2026,
    dueDate: "2026-03-10",
    deliveredAt: "2026-03-09",
    status: "Entregue" as DeclarationStatus,
    owner: "Carlos Prado",
    priority: "Alta" as Priority,
    protocol: "EFD-880012",
    notes: "Recibo validado e anexo conferido.",
  },
  {
    id: "d5",
    clientId: "c1",
    type: "RAIS",
    competence: "2025",
    yearBase: 2025,
    dueDate: "2026-03-20",
    deliveredAt: null,
    status: "Revisão interna" as DeclarationStatus,
    owner: "Marina Costa",
    priority: "Média" as Priority,
    protocol: null,
    notes: "Conferir divergência de admissões.",
  },
];

export const guides = [
  {
    id: "g1",
    clientId: "c4",
    installmentType: "Parcelamento Federal",
    agency: "Receita Federal",
    agreementNumber: "PF-2026-0198",
    reference: "03/2026",
    installmentNumber: 8,
    amount: 4820.5,
    dueDate: "2026-03-11",
    issuedAt: "2026-03-08",
    sentAt: null,
    deliveryMethod: "E-mail",
    owner: "Ana Ribeiro",
    status: "Preparado para envio" as GuideStatus,
    receiptConfirmed: false,
    confirmationDate: null,
    paymentStatus: "Pendente",
    notes: "Aguardando assinatura do sócio para disparo final.",
  },
  {
    id: "g2",
    clientId: "c2",
    installmentType: "Parcelamento Estadual",
    agency: "SEFAZ/SP",
    agreementNumber: "SP-33210",
    reference: "03/2026",
    installmentNumber: 4,
    amount: 1975.22,
    dueDate: "2026-03-07",
    issuedAt: "2026-03-01",
    sentAt: "2026-03-02",
    deliveryMethod: "WhatsApp",
    owner: "Ana Ribeiro",
    status: "Vencido" as GuideStatus,
    receiptConfirmed: false,
    confirmationDate: null,
    paymentStatus: "Em aberto",
    notes: "Cliente visualizou, mas não confirmou pagamento.",
  },
  {
    id: "g3",
    clientId: "c1",
    installmentType: "Transação Tributária",
    agency: "PGFN",
    agreementNumber: "PG-77881",
    reference: "03/2026",
    installmentNumber: 2,
    amount: 3210,
    dueDate: "2026-03-09",
    issuedAt: "2026-03-04",
    sentAt: "2026-03-04",
    deliveryMethod: "Portal do cliente",
    owner: "Carlos Prado",
    status: "Confirmado pelo cliente" as GuideStatus,
    receiptConfirmed: true,
    confirmationDate: "2026-03-05",
    paymentStatus: "Pago",
    notes: "Comprovante anexado pelo cliente.",
  },
];

export const activities = [
  { id: "a1", user: "Marina Costa", action: "Editou declaração DEFIS", target: "Alfa Alimentos", when: "há 12 min" },
  { id: "a2", user: "Ana Ribeiro", action: "Preparou guia de parcelamento", target: "Delta Log", when: "há 26 min" },
  { id: "a3", user: "Carlos Prado", action: "Confirmou recebimento da guia", target: "Alfa Alimentos", when: "há 48 min" },
  { id: "a4", user: "Sistema", action: "Marcador de atraso atualizado automaticamente", target: "Beta Engenharia", when: "há 1h" },
];

export function getClientById(id: string) {
  return clients.find((client) => client.id === id);
}

export function getClientName(clientId: string) {
  return getClientById(clientId)?.tradeName ?? "Cliente não encontrado";
}

export const dashboardMetrics = {
  activeClients: clients.filter((c) => c.status === "Ativo").length,
  pendingDeclarations: declarations.filter((d) => ["Pendente", "Em andamento", "Revisão interna", "Aguardando documentos do cliente"].includes(d.status)).length,
  completedDeclarations: declarations.filter((d) => d.status === "Entregue").length,
  lateDeclarations: declarations.filter((d) => d.status === "Entregue em atraso" || (d.deliveredAt === null && d.dueDate < "2026-03-09")).length,
  pendingGuides: guides.filter((g) => ["Não enviado", "Preparado para envio", "Pendente de retorno"].includes(g.status)).length,
  sentGuides: guides.filter((g) => ["Enviado ao cliente", "Reenviado", "Confirmado pelo cliente", "Pago"].includes(g.status)).length,
  overdueGuides: guides.filter((g) => g.status === "Vencido").length,
  criticalIssues: 6,
};
