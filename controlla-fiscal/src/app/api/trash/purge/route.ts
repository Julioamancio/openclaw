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
  const forceAll = !!body?.forceAll;
  const confirm1 = String(body?.confirm1 || "");
  const confirm2 = String(body?.confirm2 || "");

  if (forceAll) {
    if (user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Apenas administrador pode esvaziar tudo." }, { status: 403 });
    }
    if (confirm1 !== "ESVAZIAR" || confirm2 !== "APAGAR TUDO") {
      return NextResponse.json({ error: "Confirmação inválida." }, { status: 400 });
    }
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [clients, declarations, guides] = await Promise.all([
    db.client.findMany({ where: { deletedAt: forceAll ? { not: null } : { not: null, lte: cutoff } }, select: { id: true } }),
    db.declaration.findMany({ where: { deletedAt: forceAll ? { not: null } : { not: null, lte: cutoff } }, select: { id: true } }),
    db.installmentGuide.findMany({ where: { deletedAt: forceAll ? { not: null } : { not: null, lte: cutoff } }, select: { id: true } }),
  ]);

  const clientIds = clients.map((c) => c.id);
  const declarationIds = declarations.map((d) => d.id);
  const guideIds = guides.map((g) => g.id);

  await db.$transaction(async (tx) => {
    if (guideIds.length) {
      await tx.guideSendHistory.deleteMany({ where: { guideId: { in: guideIds } } });
      await tx.attachment.deleteMany({ where: { guideId: { in: guideIds } } });
      await tx.installmentGuide.deleteMany({ where: { id: { in: guideIds } } });
    }

    if (declarationIds.length) {
      await tx.attachment.deleteMany({ where: { declarationId: { in: declarationIds } } });
      await tx.declaration.deleteMany({ where: { id: { in: declarationIds } } });
    }

    if (clientIds.length) {
      await tx.attachment.deleteMany({ where: { clientId: { in: clientIds } } });
      await tx.client.deleteMany({ where: { id: { in: clientIds } } });
    }

    await tx.activityLog.create({
      data: {
        entityType: "trash",
        entityId: "purge",
        action: forceAll ? "Esvaziou lixeira completa (admin)" : "Esvaziou lixeira (30+ dias)",
        newValues: JSON.stringify({ purged: clientIds.length + declarationIds.length + guideIds.length }),
      },
    });
  });

  return NextResponse.json({ purged: clientIds.length + declarationIds.length + guideIds.length });
}
