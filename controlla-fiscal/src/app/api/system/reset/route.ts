import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    await db.$transaction(async (tx) => {
      await tx.guideSendHistory.deleteMany({});
      await tx.attachment.deleteMany({});
      await tx.declaration.deleteMany({});
      await tx.installmentGuide.deleteMany({});
      await tx.client.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.activityLog.deleteMany({});

      await tx.activityLog.create({
        data: {
          entityType: "system",
          entityId: "reset",
          action: "Resetou dados operacionais do sistema",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao resetar dados do sistema." }, { status: 400 });
  }
}
