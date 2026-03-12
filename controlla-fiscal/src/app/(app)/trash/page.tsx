import { Panel } from "@/components/ui";
import { RestoreAction } from "@/components/restore-action";
import { PurgeTrashAction } from "@/components/purge-trash-action";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";


export default async function TrashPage() {
  const user = await requirePermission("deleteRecords");
  const [clients, declarations, guides] = await Promise.all([
    db.client.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 100 }),
    db.declaration.findMany({ where: { deletedAt: { not: null } }, include: { client: true, declarationType: true }, orderBy: { deletedAt: "desc" }, take: 100 }),
    db.installmentGuide.findMany({ where: { deletedAt: { not: null } }, include: { client: true, installmentType: true }, orderBy: { deletedAt: "desc" }, take: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <Panel title="Lixeira" subtitle="Restaure registros excluídos com segurança" actions={<PurgeTrashAction isAdmin={user.role === "ADMINISTRADOR"} />}>
        <div className="space-y-4 text-sm">
          <div>
            <div className="mb-2 font-semibold">Clientes</div>
            {clients.length ? clients.map((c) => <div key={c.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 p-3"><div>{c.corporateName}</div><RestoreAction type="client" id={c.id} label="Cliente" /></div>) : <div className="text-slate-500">Sem clientes na lixeira.</div>}
          </div>
          <div>
            <div className="mb-2 font-semibold">Declarações</div>
            {declarations.length ? declarations.map((d) => <div key={d.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 p-3"><div>{d.client.corporateName} • {d.declarationType.name}</div><RestoreAction type="declaration" id={d.id} label="Declaração" /></div>) : <div className="text-slate-500">Sem declarações na lixeira.</div>}
          </div>
          <div>
            <div className="mb-2 font-semibold">Guias</div>
            {guides.length ? guides.map((g) => <div key={g.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 p-3"><div>{g.client.corporateName} • {g.installmentType.name}</div><RestoreAction type="guide" id={g.id} label="Guia" /></div>) : <div className="text-slate-500">Sem guias na lixeira.</div>}
          </div>
        </div>
      </Panel>
    </div>
  );
}
