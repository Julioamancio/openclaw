"use client";

export function PurgeTrashAction({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700"
        onClick={async () => {
          if (!confirm("Esvaziar lixeira (somente itens com +30 dias)?")) return;
          const res = await fetch("/controlla/api/trash/purge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ forceAll: false }) });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(payload?.error || "Falha ao esvaziar lixeira.");
            return;
          }
          alert(`Lixeira esvaziada: ${payload.purged || 0} item(ns) removido(s).`);
          window.location.reload();
        }}
      >
        Esvaziar lixeira (30+ dias)
      </button>

      {isAdmin ? (
        <button
          className="rounded-lg border border-red-500 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={async () => {
            if (!confirm("ATENÇÃO: esvaziar TODA a lixeira agora?")) return;
            const c1 = prompt("Digite ESVAZIAR para continuar:");
            if (c1 !== "ESVAZIAR") return;
            const c2 = prompt("Confirmação final: digite APAGAR TUDO");
            if (c2 !== "APAGAR TUDO") return;

            const res = await fetch("/controlla/api/trash/purge", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ forceAll: true, confirm1: c1, confirm2: c2 }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
              alert(payload?.error || "Falha ao esvaziar tudo.");
              return;
            }
            alert(`Lixeira total esvaziada: ${payload.purged || 0} item(ns).`);
            window.location.reload();
          }}
        >
          Esvaziar tudo agora
        </button>
      ) : null}
    </div>
  );
}
