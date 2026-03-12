import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGuideAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("guides");
  const { id } = await params;
  const [guide, clients, installmentTypes, users] = await Promise.all([
    db.installmentGuide.findFirst({ where: { id, deletedAt: null } }),
    db.client.findMany({ where: { active: true, deletedAt: null }, select: { id: true, tradeName: true, corporateName: true } }),
    db.installmentType.findMany({ where: { active: true }, select: { id: true, name: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);
  if (!guide) return notFound();
  const action = updateGuideAction.bind(null, id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-slate-950">Editar guia</h1><p className="text-sm text-slate-500">Atualize status, vencimento, envio e confirmação.</p></div><Link href="/guides" className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Voltar</Link></div>
      <form action={action} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-3">
        <select name="clientId" defaultValue={guide.clientId} className="rounded-2xl border border-slate-200 px-4 py-3">{clients.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>)}</select>
        <select name="installmentTypeId" defaultValue={guide.installmentTypeId} className="rounded-2xl border border-slate-200 px-4 py-3">{installmentTypes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <input name="agency" defaultValue={guide.agency} placeholder="Órgão/ente" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="agreementNumber" defaultValue={guide.agreementNumber || ""} placeholder="Número do parcelamento" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="reference" defaultValue={guide.reference || ""} placeholder="Referência/competência" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="installmentNumber" defaultValue={guide.installmentNumber || undefined} type="number" placeholder="Parcela" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="amount" defaultValue={guide.amount} type="number" step="0.01" placeholder="Valor" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="dueDate" defaultValue={guide.dueDate.toISOString().slice(0,10)} type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="issuedAt" defaultValue={guide.issuedAt ? guide.issuedAt.toISOString().slice(0,10) : ""} type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="sentAt" defaultValue={guide.sentAt ? guide.sentAt.toISOString().slice(0,10) : ""} type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="deliveryMethod" defaultValue={guide.deliveryMethod || ""} placeholder="Forma de envio" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="status" defaultValue={guide.status} className="rounded-2xl border border-slate-200 px-4 py-3"><option>Não enviado</option><option>Preparado para envio</option><option>Enviado ao cliente</option><option>Reenviado</option><option>Confirmado pelo cliente</option><option>Pendente de retorno</option><option>Vencido</option><option>Pago</option></select>
        <input name="paymentStatus" defaultValue={guide.paymentStatus || ""} placeholder="Situação do pagamento" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="ownerId" defaultValue={guide.ownerId || undefined} className="rounded-2xl border border-slate-200 px-4 py-3">{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm"><input name="receiptConfirmed" type="checkbox" defaultChecked={guide.receiptConfirmed} /> Confirmado pelo cliente</label>
        <input name="confirmationDate" defaultValue={guide.confirmationDate ? guide.confirmationDate.toISOString().slice(0,10) : ""} type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="notes" defaultValue={guide.notes || ""} placeholder="Observações" className="rounded-2xl border border-slate-200 px-4 py-3 xl:col-span-3" />
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white xl:col-span-3">Salvar alterações</button>
      </form>
    </div>
  );
}
