import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

async function canClientsDelete() {
  const user = await getSessionUser();
  return !!user && hasPermission(user.permissions, "deleteRecords");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const client = await db.client.update({ where: { id }, data: body });
  await db.activityLog.create({ data: { entityType: "client", entityId: id, action: "Atualizou cliente", newValues: JSON.stringify(body) } });
  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canClientsDelete())) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    await db.$transaction(async (tx) => {
      await tx.declaration.updateMany({ where: { clientId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      await tx.installmentGuide.updateMany({ where: { clientId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      await tx.client.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
      await tx.activityLog.create({ data: { entityType: "client", entityId: id, action: "Moveu cliente para lixeira" } });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir cliente." }, { status: 400 });
  }
}
