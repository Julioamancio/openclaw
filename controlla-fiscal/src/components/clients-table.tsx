"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { EditLink } from "@/components/edit-link";
import { DeleteAction } from "@/components/delete-action";

type ClientRow = {
  id: string;
  internalCode: string;
  corporateName: string;
  tradeName: string | null;
  document: string;
  taxRegime: string;
  portalUsername: string | null;
  contactName: string | null;
  primaryEmail: string | null;
  portalSite: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
};

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const allSelected = useMemo(() => clients.length > 0 && selected.length === clients.length, [clients.length, selected.length]);

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected((prev) => (prev.length === clients.length ? [] : clients.map((c) => c.id)));
  }

  async function deleteSelected() {
    if (!selected.length) return;
    if (!confirm(`Excluir ${selected.length} cliente(s) selecionado(s)?`)) return;

    const res = await fetch("/controlla/api/clients/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(payload?.error || "Falha ao excluir clientes selecionados.");
      return;
    }

    alert(`Exclusão concluída: ${payload.deleted ?? selected.length} cliente(s).`);
    window.location.reload();
  }

  async function deleteAll() {
    if (!clients.length) return;
    if (!confirm(`ATENÇÃO: excluir TODOS os ${clients.length} clientes?`)) return;
    const second = prompt('Digite EXCLUIR TODOS para confirmar:');
    if (second !== "EXCLUIR TODOS") return;

    const res = await fetch("/controlla/api/clients/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(payload?.error || "Falha ao excluir todos os clientes.");
      return;
    }

    alert(`Exclusão total concluída: ${payload.deleted ?? 0} cliente(s).`);
    window.location.reload();
  }


  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={deleteSelected} disabled={!selected.length} className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50">Excluir selecionados</button>
        <button onClick={deleteAll} disabled={!clients.length} className="rounded-xl border border-rose-400 bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800 disabled:opacity-50">Excluir todos os clientes</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Razão social</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Regime</th>
                <th className="px-4 py-3 font-medium">Usuário PBH</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 align-top"><input type="checkbox" checked={selected.includes(client.id)} onChange={() => toggleOne(client.id)} /></td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words">{client.internalCode}</td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words"><div className="font-medium text-slate-900">{client.corporateName}</div><div className="text-xs text-slate-500">{client.tradeName}</div></td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words">{client.document}</td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words">{client.taxRegime}</td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words"><div className="font-medium text-slate-900">{client.portalUsername || "—"}</div><div className="text-xs text-slate-500">{client.contactName || client.primaryEmail}</div></td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words text-xs">{client.portalSite || "—"}</td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words">{`${client.city || ""}/${client.state || ""}`}</td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words"><Badge tone={client.active ? "green" : "slate"}>{client.active ? "Ativo" : "Inativo"}</Badge></td>
                  <td className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words"><div className="flex items-center gap-2"><EditLink href={`/clients/${client.id}/edit`} /><DeleteAction endpoint={`/api/clients/${client.id}`} label={`o cliente ${client.corporateName}`} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
