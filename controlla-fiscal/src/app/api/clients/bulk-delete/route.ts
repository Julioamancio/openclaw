import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

async function canDelete() {
  const user = await getSessionUser();
  return !!user && hasPermission(user.permissions, "deleteRecords");
}

async function softDeleteClientCascade(tx: any, id: string) {
  await tx.declaration.updateMany({ where: { clientId: id, deletedAt: null }, data: { deletedAt: new Date() } });
  await tx.installmentGuide.updateMany({ where: { clientId: id, deletedAt: null }, data: { deletedAt: new Date() } });
  await tx.client.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
}

export async function POST(req: Request) {
  try {
    if (!(await canDelete())) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const all = !!body?.all;
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    const targetIds = all
      ? (await db.client.findMany({ where: { deletedAt: null }, select: { id: true } })).map((c) => c.id)
      : ids;

    if (!targetIds.length) return NextResponse.json({ deleted: 0 });

    await db.$transaction(async (tx) => {
      for (const id of targetIds) await softDeleteClientCascade(tx, id);
      await tx.activityLog.create({
        data: {
          entityType: "client",
          entityId: all ? "all" : "bulk",
          action: all ? "Moveu todos os clientes para lixeira" : "Moveu clientes selecionados para lixeira",
          newValues: JSON.stringify({ deleted: targetIds.length }),
        },
      });
    });

    return NextResponse.json({ deleted: targetIds.length });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir clientes em lote." }, { status: 400 });
  }
}
