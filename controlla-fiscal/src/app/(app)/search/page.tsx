import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { resolveDeclarationStatus, resolveGuideStatus } from "@/lib/status";
import { requirePermission } from "@/lib/rbac";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesNorm(value: string | null | undefined, q: string) {
  if (!value) return false;
  return normalize(value).includes(q);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("dashboard");
  const params = await searchParams;
  const qRaw = (params.q || "").trim();
  const q = normalize(qRaw);

  if (!qRaw) {
    return (
      <Panel title="Busca global" subtitle="Digite algo no campo de busca do topo.">
        <div className="text-sm text-slate-600">Exemplos: CNPJ, nome do cliente, competência, obrigação, órgão.</div>
      </Panel>
    );
  }

  const [allClients, allDeclarations, allGuides] = await Promise.all([
    db.client.findMany({ where: { deletedAt: null }, orderBy: { corporateName: "asc" }, take: 500 }),
    db.declaration.findMany({ where: { deletedAt: null }, include: { client: true, declarationType: true }, orderBy: { dueDate: "asc" }, take: 500 }),
    db.installmentGuide.findMany({ where: { deletedAt: null }, include: { client: true, installmentType: true }, orderBy: { dueDate: "asc" }, take: 500 }),
  ]);

  const clients = allClients.filter((c) =>
    includesNorm(c.corporateName, q) ||
    includesNorm(c.tradeName, q) ||
    includesNorm(c.document, q) ||
    includesNorm(c.internalCode, q)
  );

  const declarations = allDeclarations.filter((d) =>
    includesNorm(d.competence, q) ||
    includesNorm(d.status, q) ||
    includesNorm(d.protocol, q) ||
    includesNorm(d.client.corporateName, q) ||
    includesNorm(d.client.tradeName, q) ||
    includesNorm(d.declarationType.name, q)
  );

  const guides = allGuides.filter((g) =>
    includesNorm(g.agency, q) ||
    includesNorm(g.reference, q) ||
    includesNorm(g.status, q) ||
    includesNorm(g.agreementNumber, q) ||
    includesNorm(g.client.corporateName, q) ||
    includesNorm(g.client.tradeName, q) ||
    includesNorm(g.installmentType.name, q)
  );

  return (
    <div className="space-y-6">
      <Panel title={`Resultados para: ${qRaw}`} subtitle={`Clientes: ${clients.length} • Declarações: ${declarations.length} • Guias: ${guides.length}`}>
        <div className="text-sm text-slate-600">Busca global com suporte a acentos e variações de escrita.</div>
      </Panel>

      <Panel title="Clientes" subtitle="Resultados no cadastro de clientes">
        <div className="space-y-2 text-sm">
          {clients.length ? clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium text-slate-900">{c.corporateName}</div>
              <div className="text-slate-500">{c.document}</div>
              <Link href={`/clients/${c.id}/edit`} className="text-blue-600">Abrir cliente</Link>
            </div>
          )) : <div className="text-slate-500">Nenhum cliente encontrado.</div>}
        </div>
      </Panel>

      <Panel title="Declarações" subtitle="Resultados no fluxo de declarações">
        <div className="space-y-2 text-sm">
          {declarations.length ? declarations.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium text-slate-900">{d.client.tradeName || d.client.corporateName} • {d.declarationType.name}</div>
              <div className="text-slate-500">Competência {d.competence} • Prazo {d.dueDate.toISOString().slice(0, 10)}</div>
              <div className="mt-1"><Badge tone={resolveDeclarationStatus(d as any).includes("atras") || resolveDeclarationStatus(d as any) === "Atrasado" ? "red" : "amber"}>{resolveDeclarationStatus(d as any)}</Badge></div>
              <Link href={`/declarations/${d.id}/edit`} className="text-blue-600">Abrir declaração</Link>
            </div>
          )) : <div className="text-slate-500">Nenhuma declaração encontrada.</div>}
        </div>
      </Panel>

      <Panel title="Guias" subtitle="Resultados no fluxo de guias">
        <div className="space-y-2 text-sm">
          {guides.length ? guides.map((g) => (
            <div key={g.id} className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium text-slate-900">{g.client.tradeName || g.client.corporateName} • {g.installmentType.name}</div>
              <div className="text-slate-500">{g.agency} • Parcela {g.installmentNumber || "-"} • Venc. {g.dueDate.toISOString().slice(0, 10)}</div>
              <div className="mt-1"><Badge tone={resolveGuideStatus(g as any) === "Vencido" ? "red" : "amber"}>{resolveGuideStatus(g as any)}</Badge></div>
              <Link href={`/guides/${g.id}/edit`} className="text-blue-600">Abrir guia</Link>
            </div>
          )) : <div className="text-slate-500">Nenhuma guia encontrada.</div>}
        </div>
      </Panel>
    </div>
  );
}
