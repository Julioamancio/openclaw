import { FormSubmit } from "@/components/form-submit";
import { createClientAction, createDeclarationAction, createGuideAction } from "@/lib/actions";

export function ClientForm() {
  return (
    <form action={createClientAction} className="grid gap-3 md:grid-cols-2">
      <input name="corporateName" required placeholder="Razão social" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="tradeName" placeholder="Nome fantasia" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="document" required placeholder="CNPJ/CPF" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="taxRegime" placeholder="Regime tributário" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="contactName" placeholder="Responsável" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="primaryEmail" type="email" placeholder="E-mail principal" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="financialEmail" type="email" placeholder="E-mail financeiro" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="phone" placeholder="Telefone" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="whatsapp" placeholder="WhatsApp" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="city" placeholder="Cidade" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="state" placeholder="Estado" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="notes" placeholder="Observações" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
      <FormSubmit label="Salvar cliente" pendingLabel="Salvando cliente..." className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white md:col-span-2 disabled:opacity-60" />
    </form>
  );
}

export function DeclarationForm({ clients, declarationTypes, users }: { clients: { id: string; tradeName: string | null; corporateName: string }[]; declarationTypes: { id: string; name: string }[]; users: { id: string; name: string }[] }) {
  return (
    <form action={createDeclarationAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <select name="clientId" className="rounded-2xl border border-slate-200 px-4 py-3">{clients.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>)}</select>
      <select name="declarationTypeId" className="rounded-2xl border border-slate-200 px-4 py-3">{declarationTypes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      <input name="competence" required placeholder="Competência" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="yearBase" placeholder="Ano-base" type="number" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="dueDate" required type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <select name="status" className="rounded-2xl border border-slate-200 px-4 py-3"><option>Pendente</option><option>Em andamento</option><option>Aguardando documentos do cliente</option><option>Revisão interna</option><option>Entregue</option><option>Entregue em atraso</option><option>Cancelado</option></select>
      <select name="priority" className="rounded-2xl border border-slate-200 px-4 py-3"><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select>
      <select name="ownerId" className="rounded-2xl border border-slate-200 px-4 py-3">{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <input name="protocol" placeholder="Protocolo/recibo" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="notes" placeholder="Observações" className="rounded-2xl border border-slate-200 px-4 py-3 xl:col-span-3" />
      <FormSubmit label="Salvar declaração" pendingLabel="Salvando declaração..." className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white xl:col-span-3 disabled:opacity-60" />
    </form>
  );
}

export function GuideForm({ clients, installmentTypes, users }: { clients: { id: string; tradeName: string | null; corporateName: string }[]; installmentTypes: { id: string; name: string }[]; users: { id: string; name: string }[] }) {
  return (
    <form action={createGuideAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <select name="clientId" className="rounded-2xl border border-slate-200 px-4 py-3">{clients.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>)}</select>
      <select name="installmentTypeId" className="rounded-2xl border border-slate-200 px-4 py-3">{installmentTypes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
      <input name="agency" required placeholder="Órgão/ente" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="agreementNumber" placeholder="Número do parcelamento" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="reference" placeholder="Referência/competência" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="installmentNumber" type="number" placeholder="Parcela" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="amount" required type="number" step="0.01" placeholder="Valor" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="dueDate" required type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="issuedAt" type="date" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <input name="deliveryMethod" placeholder="Forma de envio" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <select name="status" className="rounded-2xl border border-slate-200 px-4 py-3"><option>Não enviado</option><option>Preparado para envio</option><option>Enviado ao cliente</option><option>Reenviado</option><option>Confirmado pelo cliente</option><option>Pendente de retorno</option><option>Vencido</option><option>Pago</option></select>
      <input name="paymentStatus" placeholder="Situação do pagamento" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <select name="ownerId" className="rounded-2xl border border-slate-200 px-4 py-3">{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <input name="notes" placeholder="Observações" className="rounded-2xl border border-slate-200 px-4 py-3 xl:col-span-3" />
      <FormSubmit label="Salvar guia" pendingLabel="Salvando guia..." className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white xl:col-span-3 disabled:opacity-60" />
    </form>
  );
}
