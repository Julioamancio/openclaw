import { Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { resolveDeclarationStatus, resolveGuideStatus } from "@/lib/status";
import { requirePermission } from "@/lib/rbac";

export default async function ReportsPage() {
  await requirePermission("reports");
  const [clientsCount, declarations, guides] = await Promise.all([
    db.client.count({ where: { deletedAt: null } }),
    db.declaration.findMany({ where: { deletedAt: null }, include: { client: true, owner: true } }),
    db.installmentGuide.findMany({ where: { deletedAt: null }, include: { client: true, owner: true } }),
  ]);

  const pendingDeclarations = declarations.filter((d) => ["Pendente", "Em andamento", "Revisão interna", "Aguardando documentos do cliente", "Atrasado"].includes(resolveDeclarationStatus(d as any))).length;
  const lateDeclarations = declarations.filter((d) => ["Atrasado", "Entregue em atraso"].includes(resolveDeclarationStatus(d as any))).length;
  const pendingGuides = guides.filter((g) => ["Não enviado", "Preparado para envio", "Pendente de retorno"].includes(resolveGuideStatus(g as any))).length;
  const overdueGuides = guides.filter((g) => resolveGuideStatus(g as any) === "Vencido").length;

  return (
    <div className="space-y-6">
      <Panel title="Relatórios" subtitle="Exportações e visão gerencial com dados reais">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-medium text-slate-900">Resumo geral</div>
            <div className="mt-2 text-sm text-slate-600">Clientes: {clientsCount} • Declarações: {declarations.length} • Guias: {guides.length}</div>
            <a href="/controlla/api/reports/export?type=summary&format=xlsx" className="mt-3 inline-block text-sm font-medium text-blue-600">Exportar Planilha Excel</a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-medium text-slate-900">Declarações pendentes</div>
            <div className="mt-2 text-sm text-slate-600">Total: {pendingDeclarations} • Atrasadas: {lateDeclarations}</div>
            <a href="/controlla/api/reports/export?type=declarations&format=xlsx" className="mt-3 inline-block text-sm font-medium text-blue-600">Exportar Planilha Excel</a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-medium text-slate-900">Guias operacionais</div>
            <div className="mt-2 text-sm text-slate-600">Pendentes: {pendingGuides} • Vencidas: {overdueGuides}</div>
            <a href="/controlla/api/reports/export?type=guides&format=xlsx" className="mt-3 inline-block text-sm font-medium text-blue-600">Exportar Planilha Excel</a>
          </div>
        </div>
      </Panel>
    </div>
  );
}
