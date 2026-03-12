import { Badge, DataTable, Panel } from "@/components/ui";
import { DeclarationForm } from "@/components/forms";
import { DeleteAction } from "@/components/delete-action";
import { EditLink } from "@/components/edit-link";
import { TruncateCell } from "@/components/responsive-fixes";
import { db } from "@/lib/db";
import { resolveDeclarationStatus } from "@/lib/status";
import { requirePermission } from "@/lib/rbac";

export default async function DeclarationsPage({ searchParams }: { searchParams: Promise<{ status?: string; client?: string; ok?: string }> }) {
  await requirePermission("declarations");
  const params = await searchParams;
  const ok = params.ok || "";
  const [clients, declarationTypes, users] = await Promise.all([
    db.client.findMany({ where: { active: true, deletedAt: null }, select: { id: true, tradeName: true, corporateName: true } }),
    db.declarationType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const declarations = await db.declaration.findMany({
    include: { client: true, owner: true, declarationType: true },
    orderBy: { dueDate: "asc" },
    where: {
      deletedAt: null,
      ...(params.client ? { clientId: params.client } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
  });

  return (
    <div className="space-y-6">
      {ok === "declaration_created" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Declaração salva com sucesso.</div> : null}
      {ok === "declaration_updated" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Declaração atualizada com sucesso.</div> : null}
      <Panel title="Nova declaração" subtitle="Registrar obrigação com responsável, prazo e protocolo">
        <DeclarationForm clients={clients} declarationTypes={declarationTypes} users={users} />
      </Panel>
      <Panel title="Declarações" subtitle="Gestão completa das obrigações contábeis, fiscais e acessórias" actions={<div className="flex flex-wrap items-center gap-2"><form className="flex flex-wrap items-center gap-2"><select name="client" defaultValue={params.client || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todos os clientes</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>)}</select><select name="status" defaultValue={params.status || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todos os status</option><option>Pendente</option><option>Em andamento</option><option>Aguardando documentos do cliente</option><option>Revisão interna</option><option>Entregue</option><option>Entregue em atraso</option><option>Cancelado</option></select><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Filtrar</button></form></div>}>
        <DataTable
          columns={["Cliente", "Tipo", "Competência", "Prazo", "Responsável", "Prioridade", "Status", "Ações"]}
          rows={declarations.map((d) => {
            const computed = resolveDeclarationStatus(d as any);
            return [
              <TruncateCell key={d.id + 'c'} title={d.client.tradeName || d.client.corporateName} subtitle={d.client.document} />,
              d.declarationType.name,
              d.competence,
              d.dueDate.toISOString().slice(0, 10),
              d.owner?.name || "—",
              <Badge key={d.id + "p"} tone={d.priority === "Crítica" ? "red" : d.priority === "Alta" ? "amber" : "blue"}>{d.priority}</Badge>,
              <Badge key={d.id + "s"} tone={computed === "Atrasado" || computed.includes("atraso") ? "red" : computed === "Entregue" ? "green" : "amber"}>{computed}</Badge>,
              <div key={d.id + 'a'} className="flex items-center gap-2"><EditLink href={`/declarations/${d.id}/edit`} /><DeleteAction endpoint={`/api/declarations/${d.id}`} label={`a declaração ${d.declarationType.name}`} /></div>,
            ];
          })}
        />
      </Panel>
    </div>
  );
}
