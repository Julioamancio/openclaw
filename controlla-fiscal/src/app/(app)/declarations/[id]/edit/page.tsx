import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDeclarationAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export default async function EditDeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("declarations");
  const { id } = await params;
  const [declaration, clients, declarationTypes, users] = await Promise.all([
    db.declaration.findFirst({ where: { id, deletedAt: null } }),
    db.client.findMany({ where: { active: true, deletedAt: null }, select: { id: true, tradeName: true, corporateName: true } }),
    db.declarationType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);
  if (!declaration) return notFound();
  const action = updateDeclarationAction.bind(null, id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-slate-950">Editar declaração</h1><p className="text-sm text-slate-500">Atualize status, prazo, protocolo e responsável.</p></div><Link href="/declarations" className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Voltar</Link></div>
      <form action={action} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-3">
        <select name="clientId" defaultValue={declaration.clientId} className="rounded-2xl border border-slate-200 px-4 py-3">{clients.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>)}</select>
        <select name="declarationTypeId" defaultValue={declaration.declarationTypeId} className="rounded-2xl border border-slate-200 px-4 py-3">{declarationTypes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <input name="competence" defaultValue={declaration.competence} placeholder="Competência" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="yearBase" defaultValue={declaration.yearBase || undefined} placeholder="Ano-base" type="number" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="dueDate" defaultValue={declaration.dueDate.toISOString().slice(0,10)} type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="deliveredAt" defaultValue={declaration.deliveredAt ? declaration.deliveredAt.toISOString().slice(0,10) : ""} type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="status" defaultValue={declaration.status} className="rounded-2xl border border-slate-200 px-4 py-3"><option>Pendente</option><option>Em andamento</option><option>Aguardando documentos do cliente</option><option>Revisão interna</option><option>Entregue</option><option>Entregue em atraso</option><option>Cancelado</option></select>
        <select name="priority" defaultValue={declaration.priority} className="rounded-2xl border border-slate-200 px-4 py-3"><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select>
        <select name="ownerId" defaultValue={declaration.ownerId || undefined} className="rounded-2xl border border-slate-200 px-4 py-3">{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <input name="protocol" defaultValue={declaration.protocol || ""} placeholder="Protocolo/recibo" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="notes" defaultValue={declaration.notes || ""} placeholder="Observações" className="rounded-2xl border border-slate-200 px-4 py-3 xl:col-span-3" />
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white xl:col-span-3">Salvar alterações</button>
      </form>
    </div>
  );
}
