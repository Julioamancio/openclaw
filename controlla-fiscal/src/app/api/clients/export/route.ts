import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";

export async function GET() {
  const clients = await db.client.findMany({ orderBy: { corporateName: "asc" } });
  const rows = clients.map((client) => ({
    Cliente: client.corporateName,
    CNPJ: client.document,
    Regime: client.taxRegime,
    "Usuario PBH": client.portalUsername || "",
    Senha: client.portalPassword || "",
    Site: client.portalSite || "",
    SIMPLES: client.simplesNotes || "",
    "Nome fantasia": client.tradeName || "",
    Responsável: client.contactName || "",
    "E-mail principal": client.primaryEmail || "",
    "E-mail financeiro": client.financialEmail || "",
    Telefone: client.phone || "",
    WhatsApp: client.whatsapp || "",
    Cidade: client.city || "",
    Estado: client.state || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="clientes-controlla-fiscal.xlsx"',
    },
  });
}
