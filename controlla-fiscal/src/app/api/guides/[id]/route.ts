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
  const guide = await db.installmentGuide.update({ where: { id }, data: { ...body, dueDate: body.dueDate ? new Date(body.dueDate) : undefined, issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined, sentAt: body.sentAt ? new Date(body.sentAt) : undefined, confirmationDate: body.confirmationDate ? new Date(body.confirmationDate) : undefined } });
  await db.activityLog.create({ data: { entityType: "guide", entityId: id, action: "Atualizou guia", newValues: JSON.stringify(body) } });
  return NextResponse.json(guide);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canDelete())) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  try {
    await db.installmentGuide.update({ where: { id }, data: { deletedAt: new Date() } });
    await db.activityLog.create({ data: { entityType: "guide", entityId: id, action: "Moveu guia para lixeira" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a guia." }, { status: 400 });
  }
}
