import { Panel } from "@/components/ui";
import { ClientForm } from "@/components/forms";
import { ClientsTable } from "@/components/clients-table";
import { ImportClientsForm } from "@/components/import-clients-form";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; ok?: string; imported?: string; errors?: string }> }) {
  await requirePermission("clients");
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const page = Math.max(1, Number(params.page || "1"));
  const ok = params.ok || "";
  const imported = Number(params.imported || "0");
  const errorsCount = Number(params.errors || "0");
  const pageSize = 10;
  const where = q
    ? {
        deletedAt: null,
        OR: [
          { corporateName: { contains: q } },
          { tradeName: { contains: q } },
          { document: { contains: q } },
          { internalCode: { contains: q } },
        ],
      }
    : { deletedAt: null };
  const [clients, total] = await Promise.all([
    db.client.findMany({ where, orderBy: { corporateName: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.client.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {ok === "client_created" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Cliente salvo com sucesso.</div> : null}
      {ok === "client_updated" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Cliente atualizado com sucesso.</div> : null}
      {ok === "import_done" ? <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Importação concluída: {imported} cliente(s) importado(s){errorsCount ? `, ${errorsCount} com erro` : ""}.</div> : null}
      <Panel title="Novo cliente" subtitle="Cadastro operacional com dados contábeis e fiscais">
        <ClientForm />
      </Panel>
      <Panel title="Clientes" subtitle="Cadastro completo com visão 360° do cliente" actions={<div className="flex flex-wrap items-center gap-2"><form className="flex items-center gap-2"><input name="q" defaultValue={q} placeholder="Buscar cliente, CNPJ, código" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Filtrar</button></form><a href="/controlla/api/clients/export" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Exportar Excel</a><ImportClientsForm /></div>}>
        <ClientsTable clients={clients} />
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <div>{total} cliente(s) • página {page} de {totalPages}</div>
          <div className="flex gap-2">
            {page > 1 ? <a className="rounded-xl border border-slate-200 px-3 py-2" href={`/controlla/clients?q=${encodeURIComponent(q)}&page=${page - 1}`}>Anterior</a> : null}
            {page < totalPages ? <a className="rounded-xl border border-slate-200 px-3 py-2" href={`/controlla/clients?q=${encodeURIComponent(q)}&page=${page + 1}`}>Próxima</a> : null}
          </div>
        </div>
      </Panel>
      <Panel title="Modelo de importação Excel" subtitle="Planilha compatível com seu layout atual">
        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-4">
          <div>Cliente</div>
          <div>CNPJ</div>
          <div>Regime</div>
          <div>Usuario PBH / Usuário PBH</div>
          <div>Senha</div>
          <div>Site</div>
          <div>SIMPLES</div>
          <div>Também aceita aliases como Razão social, CNPJ/CPF e Regime tributário</div>
        </div>
      </Panel>
    </div>
  );
}
