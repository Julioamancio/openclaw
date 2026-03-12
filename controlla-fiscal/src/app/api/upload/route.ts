import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  const clientId = String(formData.get("clientId") || "") || null;
  const declarationId = String(formData.get("declarationId") || "") || null;
  const guideId = String(formData.get("guideId") || "") || null;
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const outputPath = path.join(dir, fileName);
  await writeFile(outputPath, buffer);

  const attachment = await db.attachment.create({
    data: {
      clientId,
      declarationId,
      guideId,
      fileName: file.name,
      filePath: `/uploads/${fileName}`,
      mimeType: file.type,
    },
  });

  return NextResponse.json({ ok: true, attachment });
}
