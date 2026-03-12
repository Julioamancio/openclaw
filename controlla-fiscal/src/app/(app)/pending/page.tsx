import { Badge, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { resolveDeclarationStatus, resolveGuideStatus } from "@/lib/status";
import { requirePermission } from "@/lib/rbac";

export default async function PendingPage() {
  await requirePermission("dashboard");
  const [declarations, guides] = await Promise.all([
    db.declaration.findMany({ where: { deletedAt: null }, include: { client: true, declarationType: true, owner: true }, orderBy: { dueDate: "asc" } }),
    db.installmentGuide.findMany({ where: { deletedAt: null }, include: { client: true, installmentType: true, owner: true }, orderBy: { dueDate: "asc" } }),
  ]);

  const declarationItems = declarations
    .map((d) => ({
      id: `d-${d.id}`,
      kind: "Declaração",
      title: d.declarationType.name,
      client: d.client.tradeName || d.client.corporateName,
      due: d.dueDate,
      owner: d.owner?.name || "Sem responsável",
      status: resolveDeclarationStatus(d as any),
    }))
    .filter((i) => !["Entregue", "Cancelado"].includes(i.status));

  const guideItems = guides
    .map((g) => ({
      id: `g-${g.id}`,
      kind: "Guia",
      title: g.installmentType.name,
      client: g.client.tradeName || g.client.corporateName,
      due: g.dueDate,
      owner: g.owner?.name || "Sem responsável",
      status: resolveGuideStatus(g as any),
    }))
    .filter((i) => i.status !== "Pago");

  const items = [...declarationItems, ...guideItems].sort((a, b) => a.due.getTime() - b.due.getTime());

  return (
    <Panel title="Central de pendências" subtitle="Fila operacional com rastreabilidade e priorização">
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Nenhuma pendência no momento.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{item.kind}</div>
                <div className="font-semibold text-slate-900">{item.title} • {item.client}</div>
                <div className="text-sm text-slate-500">Prazo {item.due.toISOString().slice(0, 10)} • Responsável {item.owner}</div>
              </div>
              <Badge tone={String(item.status).toLowerCase().includes("atras") || item.status === "Vencido" ? "red" : "amber"}>{item.status}</Badge>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
