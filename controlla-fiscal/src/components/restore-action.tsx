"use client";

export function RestoreAction({ type, id, label }: { type: "client" | "declaration" | "guide"; id: string; label: string }) {
  return (
    <button
      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
      onClick={async () => {
        const res = await fetch("/controlla/api/trash/restore", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, id }),
        });
        if (!res.ok) {
          alert("Falha ao restaurar.");
          return;
        }
        alert(`${label} restaurado com sucesso.`);
        window.location.reload();
      }}
    >
      Restaurar
    </button>
  );
}
