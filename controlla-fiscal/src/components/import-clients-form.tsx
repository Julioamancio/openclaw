"use client";

import { useState } from "react";

export function ImportClientsForm() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement | null;
        if (!fileInput?.files?.[0]) return;

        const data = new FormData();
        data.append("file", fileInput.files[0]);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/controlla/api/clients/import");
        xhr.setRequestHeader("Accept", "application/json");

        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        };

        xhr.onloadstart = () => {
          setUploading(true);
          setProgress(0);
        };

        xhr.onerror = () => {
          setUploading(false);
          alert("Falha no upload da planilha.");
        };

        xhr.onload = () => {
          setUploading(false);
          try {
            const payload = JSON.parse(xhr.responseText || "{}");
            const imported = Number(payload.imported || 0);
            const errors = Array.isArray(payload.errors) ? payload.errors.length : 0;
            window.location.href = `/controlla/clients?ok=import_done&imported=${imported}&errors=${errors}`;
          } catch {
            window.location.href = "/controlla/clients?error=import_failed";
          }
        };

        xhr.send(data);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="file" name="file" accept=".xlsx,.xls,.csv" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
      <button disabled={uploading} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{uploading ? "Importando..." : "Importar Excel"}</button>
      {uploading ? <div className="text-xs text-slate-600">{progress}%</div> : null}
    </form>
  );
}
