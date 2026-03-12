import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

async function canDelete() {
  const user = await getSessionUser();
  return !!user && hasPermission(user.permissions, "deleteRecords");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : undefined;
  const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
  const status = deliveredAt && dueDate ? (deliveredAt > dueDate ? "Entregue em atraso" : "Entregue") : body.status;
  const declaration = await db.declaration.update({ where: { id }, data: { ...body, deliveredAt, dueDate, status } });
  await db.activityLog.create({ data: { entityType: "declaration", entityId: id, action: "Atualizou declaração", newValues: JSON.stringify({ ...body, status }) } });
  return NextResponse.json(declaration);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canDelete())) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  try {
    await db.declaration.update({ where: { id }, data: { deletedAt: new Date() } });
    await db.activityLog.create({ data: { entityType: "declaration", entityId: id, action: "Moveu declaração para lixeira" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a declaração." }, { status: 400 });
  }
}
