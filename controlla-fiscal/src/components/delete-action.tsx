"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteAction({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`Excluir ${label}?`)) return;
        const url = endpoint.startsWith('/api/') ? `/controlla${endpoint}` : endpoint;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          alert(payload?.error || "Não foi possível excluir este registro.");
          return;
        }
        router.refresh();
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
    >
      <Trash2 size={14} /> Excluir
    </button>
  );
}
