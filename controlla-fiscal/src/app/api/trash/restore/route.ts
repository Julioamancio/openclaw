import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.permissions, "deleteRecords")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const type = String(body?.type || "");
  const id = String(body?.id || "");
  if (!type || !id) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

  if (type === "client") {
    await db.$transaction(async (tx) => {
      await tx.client.update({ where: { id }, data: { deletedAt: null, active: true } });
      await tx.declaration.updateMany({ where: { clientId: id }, data: { deletedAt: null } });
      await tx.installmentGuide.updateMany({ where: { clientId: id }, data: { deletedAt: null } });
    });
  } else if (type === "declaration") {
    await db.declaration.update({ where: { id }, data: { deletedAt: null } });
  } else if (type === "guide") {
    await db.installmentGuide.update({ where: { id }, data: { deletedAt: null } });
  } else {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
