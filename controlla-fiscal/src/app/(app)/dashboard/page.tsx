import { ChartPlaceholder } from "@/components/charts-placeholder";
import { Badge, DataTable, MetricCard, Panel } from "@/components/ui";
import { TruncateCell } from "@/components/responsive-fixes";
import { db } from "@/lib/db";
import { resolveDeclarationStatus, resolveGuideStatus } from "@/lib/status";
import { requirePermission } from "@/lib/rbac";

export default async function DashboardPage() {
  await requirePermission("dashboard");
  const [clientsCount, declarations, guides, activities] = await Promise.all([
    db.client.count({ where: { active: true, deletedAt: null } }),
    db.declaration.findMany({ where: { deletedAt: null }, include: { client: true, declarationType: true, owner: true } }),
    db.installmentGuide.findMany({ where: { deletedAt: null }, include: { client: true, installmentType: true, owner: true } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: true } }),
  ]);

  const declarationStatuses: string[] = declarations.map((item) => resolveDeclarationStatus(item as never));
  const guideStatuses: string[] = guides.map((item) => resolveGuideStatus(item as never));
  const pendingDeclarations = declarationStatuses.filter((s) => ["Pendente", "Em andamento", "Revisão interna", "Aguardando documentos do cliente", "Atrasado"].includes(s)).length;
  const lateDeclarations = declarationStatuses.filter((s) => s === "Atrasado" || s === "Entregue em atraso").length;
  const deliveredDeclarations = declarationStatuses.filter((s) => s === "Entregue").length;
  const pendingGuides = guideStatuses.filter((s) => ["Não enviado", "Preparado para envio", "Pendente de retorno"].includes(s)).length;
  const sentGuides = guideStatuses.filter((s) => ["Enviado ao cliente", "Reenviado", "Confirmado pelo cliente", "Pago"].includes(s)).length;
  const overdueGuides = guideStatuses.filter((s) => s === "Vencido").length;
  const criticalIssues = lateDeclarations + overdueGuides;

  const upcomingDeclarations = declarations.slice().sort((a,b)=>a.dueDate.getTime()-b.dueDate.getTime()).slice(0,5);
  const pendingGuideRows = guides.slice().sort((a,b)=>a.dueDate.getTime()-b.dueDate.getTime()).slice(0,5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clientes ativos" value={clientsCount} helper="Base ativa do escritório" />
        <MetricCard label="Declarações pendentes" value={pendingDeclarations} tone="amber" helper="Demandam ação da equipe" />
        <MetricCard label="Declarações entregues" value={deliveredDeclarations} tone="green" helper="Concluídas no prazo ou tratadas" />
        <MetricCard label="Declarações atrasadas" value={lateDeclarations} tone="red" helper="Itens críticos ou fora do prazo" />
        <MetricCard label="Guias pendentes de envio" value={pendingGuides} tone="blue" helper="Fluxo 2 separado do fiscal" />
        <MetricCard label="Guias enviadas" value={sentGuides} tone="green" helper="Com rastreabilidade de envio" />
        <MetricCard label="Guias vencidas" value={overdueGuides} tone="red" helper="Exigem follow-up imediato" />
        <MetricCard label="Pendências críticas" value={criticalIssues} tone="amber" helper="Soma de atrasos e vencidos" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Declarações por status" subtitle="Visão operacional do fluxo 1">
          <ChartPlaceholder
            title="Pipeline fiscal"
            data={[
              { label: "Pendentes", value: pendingDeclarations, tone: "amber" },
              { label: "Entregues", value: deliveredDeclarations, tone: "green" },
              { label: "Atrasadas", value: lateDeclarations, tone: "red" },
              { label: "Total", value: declarations.length, tone: "blue" },
            ]}
          />
        </Panel>
        <Panel title="Guias por status" subtitle="Visão operacional do fluxo 2">
          <ChartPlaceholder
            title="Envio ao cliente"
            data={[
              { label: "Pendentes", value: pendingGuides, tone: "amber" },
              { label: "Enviadas", value: sentGuides, tone: "green" },
              { label: "Vencidas", value: overdueGuides, tone: "red" },
              { label: "Total", value: guides.length, tone: "blue" },
            ]}
          />
        </Panel>
        <Panel title="Produtividade por colaborador" subtitle="Entregas, envios e pendências tratadas">
          <ChartPlaceholder
            title="Performance da equipe"
            data={Object.entries(
              [...declarations, ...guides].reduce<Record<string, number>>((acc, item: any) => {
                const name = item.owner?.name || "Sem responsável";
                acc[name] = (acc[name] || 0) + 1;
                return acc;
              }, {})
            )
              .slice(0, 4)
              .map(([label, value], idx) => ({ label, value, tone: (["blue", "green", "amber", "red"] as const)[idx % 4] }))}
          />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Obrigações próximas do prazo" subtitle="Lista rápida para ação imediata">
          <DataTable columns={["Cliente", "Obrigação", "Competência", "Prazo", "Status"]} rows={upcomingDeclarations.map((item) => [<TruncateCell key={item.id+'c'} title={item.client.tradeName || item.client.corporateName} subtitle={item.client.document} />, item.declarationType.name, item.competence, item.dueDate.toISOString().slice(0,10), <Badge key={item.id} tone={(resolveDeclarationStatus(item as any) === "Atrasado" || resolveDeclarationStatus(item as any) === "Entregue em atraso") ? "red" : resolveDeclarationStatus(item as any) === "Entregue" ? "green" : "amber"}>{resolveDeclarationStatus(item as any)}</Badge>])} />
        </Panel>
        <Panel title="Guias operacionais" subtitle="Controle do fluxo de parcelamento">
          <DataTable columns={["Cliente", "Órgão", "Parcela", "Vencimento", "Status"]} rows={pendingGuideRows.map((item) => [<TruncateCell key={item.id+'c'} title={item.client.tradeName || item.client.corporateName} subtitle={item.client.document} />, item.agency, `${item.installmentNumber ?? "-"}`, item.dueDate.toISOString().slice(0,10), <Badge key={item.id} tone={resolveGuideStatus(item as any) === "Pago" ? "green" : resolveGuideStatus(item as any) === "Vencido" ? "red" : "amber"}>{resolveGuideStatus(item as any)}</Badge>])} />
        </Panel>
      </div>

      <Panel title="Últimas atividades da equipe" subtitle="Histórico recente para rastreabilidade e auditoria">
        <div className="space-y-4">{activities.map((a) => <div key={a.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="font-medium text-slate-900 break-words">{a.action}</div><div className="text-sm text-slate-500 break-words">{a.user?.name || "Sistema"} • {a.entityType}</div></div><Badge tone="slate">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}</Badge></div>)}</div>
      </Panel>
    </div>
  );
}
