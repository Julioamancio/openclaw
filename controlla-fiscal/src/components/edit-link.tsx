import Link from "next/link";
import { Pencil } from "lucide-react";

export function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
      <Pencil size={14} /> Editar
    </Link>
  );
}
