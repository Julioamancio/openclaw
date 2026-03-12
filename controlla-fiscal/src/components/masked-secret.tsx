"use client";

import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

function normalizeUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export function MaskedSecret({ value }: { value: string | null | undefined }) {
  const [visible, setVisible] = useState(false);
  const masked = useMemo(() => (value ? "•".repeat(Math.max(8, value.length)) : "—"), [value]);
  if (!value) return <span>—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{visible ? value : masked}</span>
      <button type="button" onClick={() => setVisible((v) => !v)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={visible ? "Ocultar senha" : "Mostrar senha"}>
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function SecureLink({ url }: { url: string | null | undefined }) {
  if (!url) return <span>—</span>;
  const safeUrl = normalizeUrl(url);
  return (
    <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900">
      Abrir portal
      <ExternalLink size={14} />
    </a>
  );
}
