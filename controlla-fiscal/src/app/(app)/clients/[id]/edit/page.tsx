import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClientAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("clients");
  const { id } = await params;
  const client = await db.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) return notFound();
  const action = updateClientAction.bind(null, id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Editar cliente</h1>
          <p className="text-sm text-slate-500">Atualize dados cadastrais e de portal.</p>
        </div>
        <Link href={`/clients/${id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Voltar</Link>
      </div>
      <form action={action} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <input name="corporateName" defaultValue={client.corporateName} placeholder="Razão social" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="tradeName" defaultValue={client.tradeName || ""} placeholder="Nome fantasia" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="document" defaultValue={client.document} placeholder="CNPJ/CPF" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="taxRegime" defaultValue={client.taxRegime} placeholder="Regime tributário" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="contactName" defaultValue={client.contactName || ""} placeholder="Responsável" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="primaryEmail" defaultValue={client.primaryEmail || ""} placeholder="E-mail principal" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="financialEmail" defaultValue={client.financialEmail || ""} placeholder="E-mail financeiro" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="phone" defaultValue={client.phone || ""} placeholder="Telefone" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="whatsapp" defaultValue={client.whatsapp || ""} placeholder="WhatsApp" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="city" defaultValue={client.city || ""} placeholder="Cidade" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="state" defaultValue={client.state || ""} placeholder="Estado" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="portalUsername" defaultValue={client.portalUsername || ""} placeholder="Usuário portal" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="portalPassword" defaultValue={client.portalPassword || ""} placeholder="Senha portal" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="portalSite" defaultValue={client.portalSite || ""} placeholder="Site portal" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="simplesNotes" defaultValue={client.simplesNotes || ""} placeholder="Observações SIMPLES" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input name="notes" defaultValue={client.notes || ""} placeholder="Observações gerais" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white md:col-span-2">Salvar alterações</button>
      </form>
    </div>
  );
}
