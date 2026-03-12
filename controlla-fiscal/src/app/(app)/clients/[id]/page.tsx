import { notFound } from "next/navigation";
import { EditLink } from "@/components/edit-link";
import { MaskedSecret, SecureLink } from "@/components/masked-secret";
import { Badge, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("clients");
  const { id } = await params;
  const client = await db.client.findFirst({ where: { id, deletedAt: null }, include: { declarations: { where: { deletedAt: null } }, installmentGuides: { where: { deletedAt: null } }, attachments: true } });
  if (!client) return notFound();

  return (
    <div className="space-y-6">
      <Panel title={client.tradeName || client.corporateName} subtitle={`${client.corporateName} • ${client.document}`} actions={<EditLink href={`/clients/${id}/edit`} />}>
        <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-slate-500">Regime tributário</div><div className="font-semibold">{client.taxRegime}</div></div>
          <div><div className="text-slate-500">Responsável</div><div className="font-semibold">{client.contactName}</div></div>
          <div><div className="text-slate-500">E-mail financeiro</div><div className="font-semibold">{client.financialEmail}</div></div>
          <div><div className="text-slate-500">Status</div><Badge tone="green">{client.active ? "Ativo" : "Inativo"}</Badge></div>
          <div><div className="text-slate-500">Usuário PBH</div><div className="font-semibold">{client.portalUsername || "—"}</div></div>
          <div><div className="text-slate-500">Senha portal</div><MaskedSecret value={client.portalPassword} /></div>
          <div><div className="text-slate-500">Site</div><SecureLink url={client.portalSite} /></div>
          <div><div className="text-slate-500">Simples</div><div className="font-semibold">{client.simplesNotes || "—"}</div></div>
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Declarações" subtitle="Fluxo 1">
          <div className="space-y-3">{client.declarations.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div className="font-medium">{item.competence}</div><Badge tone={item.status.includes("atraso") ? "red" : item.status === "Entregue" ? "green" : "amber"}>{item.status}</Badge></div><div className="mt-2 text-sm text-slate-500">Prazo {item.dueDate.toISOString().slice(0,10)}</div></div>)}</div>
        </Panel>
        <Panel title="Guias de parcelamento" subtitle="Fluxo 2">
          <div className="space-y-3">{client.installmentGuides.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div className="font-medium">{item.reference || item.agreementNumber}</div><Badge tone={item.status === "Pago" ? "green" : item.status === "Vencido" ? "red" : "amber"}>{item.status}</Badge></div><div className="mt-2 text-sm text-slate-500">Parcela {item.installmentNumber} • Vencimento {item.dueDate.toISOString().slice(0,10)}</div></div>)}</div>
        </Panel>
      </div>
      <Panel title="Anexos" subtitle="Upload inicial para rastreabilidade documental">
        <form action="/controlla/api/upload" method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="clientId" value={client.id} />
          <input type="file" name="file" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">Enviar anexo</button>
        </form>
        <div className="mt-4 space-y-2">{client.attachments.map((att) => <a key={att.id} href={att.filePath} target="_blank" className="block rounded-xl border border-slate-200 px-3 py-2 text-sm text-blue-700">{att.fileName}</a>)}</div>
      </Panel>
    </div>
  );
}
