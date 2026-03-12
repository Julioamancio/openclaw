"use client";

import { useFormStatus } from "react-dom";

export function FormSubmit({ label, pendingLabel, className }: { label: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className || "rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white disabled:opacity-60"}>
      {pending ? pendingLabel || "Salvando..." : label}
    </button>
  );
}
