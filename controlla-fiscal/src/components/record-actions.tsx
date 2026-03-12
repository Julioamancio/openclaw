"use client";

import { Pencil, Trash2 } from "lucide-react";

export function RecordActions({ label, onEdit, onDelete }: { label: string; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
        <Pencil size={14} /> Editar
      </button>
      <button type="button" onClick={() => { if (confirm(`Excluir ${label}?`)) onDelete?.(); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
        <Trash2 size={14} /> Excluir
      </button>
    </div>
  );
}
