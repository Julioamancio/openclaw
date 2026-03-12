import { Badge, DataTable, Panel } from "@/components/ui";
import { GuideForm } from "@/components/forms";
import { DeleteAction } from "@/components/delete-action";
import { EditLink } from "@/components/edit-link";
import { TruncateCell } from "@/components/responsive-fixes";
import { db } from "@/lib/db";
import { resolveGuideStatus } from "@/lib/status";
import { requirePermission } from "@/lib/rbac";

export default async function GuidesPage({ searchParams }: { searchParams: Promise<{ status?: string; client?: string; ok?: string }> }) {
  await requirePermission("guides");
  const params = await searchParams;
  const ok = params.ok || "";
  const [clients, installmentTypes, users] = await Promise.all([
    db.client.findMany({ where: { active: true, deletedAt: null }, select: { id: true, tradeName: true, corporateName: true } }),
    db.installmentType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const guides = await db.installmentGuide.findMany({
    include: { client: true, owner: true, installmentType: true },
    orderBy: { dueDate: "asc" },
    where: {
      deletedAt: null,
      ...(params.client ? { clientId: params.client } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
  });

  return (
    <div className="space-y-6">
      {ok === "guide_created" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Guia salva com sucesso.</div> : null}
      {ok === "guide_updated" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Guia atualizada com sucesso.</div> : null}
      <Panel title="Nova guia" subtitle="Registrar guia de parcelamento com rastreabilidade de envio">
        <GuideForm clients={clients} installmentTypes={installmentTypes} users={users} />
      </Panel>
      <Panel title="Guias de parcelamento" subtitle="Fluxo separado para envio, confirmação e pagamento" actions={<div className="flex flex-wrap items-center gap-2"><form className="flex flex-wrap items-center gap-2"><select name="client" defaultValue={params.client || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todos os clientes</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>)}</select><select name="status" defaultValue={params.status || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todos os status</option><option>Não enviado</option><option>Preparado para envio</option><option>Enviado ao cliente</option><option>Reenviado</option><option>Confirmado pelo cliente</option><option>Pendente de retorno</option><option>Vencido</option><option>Pago</option></select><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Filtrar</button></form></div>}>
        <DataTable
          columns={["Cliente", "Tipo", "Órgão", "Parcela", "Valor", "Vencimento", "Status", "Ações"]}
          rows={guides.map((g) => {
            const computed = resolveGuideStatus(g as any);
            return [
              <TruncateCell key={g.id + 'c'} title={g.client.tradeName || g.client.corporateName} subtitle={g.client.document} />,
              g.installmentType.name,
              g.agency,
              `${g.installmentNumber ?? "-"}`,
              `R$ ${g.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
              g.dueDate.toISOString().slice(0, 10),
              <Badge key={g.id} tone={computed === "Pago" ? "green" : computed === "Vencido" ? "red" : "amber"}>{computed}</Badge>,
              <div key={g.id + 'a'} className="flex items-center gap-2"><EditLink href={`/guides/${g.id}/edit`} /><DeleteAction endpoint={`/api/guides/${g.id}`} label={`a guia ${g.agency}`} /></div>,
            ];
          })}
        />
      </Panel>
    </div>
  );
}
