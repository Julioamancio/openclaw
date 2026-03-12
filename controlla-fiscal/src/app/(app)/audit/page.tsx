import { Badge, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export default async function AuditPage() {
  await requirePermission("audit");
  const logs = await db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: true } });
  return (
    <Panel title="Auditoria e histórico" subtitle="Linha do tempo completa das ações do sistema">
      <div className="space-y-4">
        {logs.map((a) => (
          <div key={a.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">{a.action}</div>
              <Badge tone="slate">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}</Badge>
            </div>
            <div className="mt-2 text-sm text-slate-500">{a.user?.name || "Sistema"} • {a.entityType} • {a.entityId}</div>
            {a.newValues ? <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">{a.newValues}</pre> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
