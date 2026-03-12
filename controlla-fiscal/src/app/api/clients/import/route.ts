import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

function norm(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function val(row: Record<string, unknown>, keys: string[]) {
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) map.set(norm(k), v);

  for (const key of keys) {
    const found = map.get(norm(key));
    if (found !== undefined && found !== null && String(found).trim() !== "") return String(found).trim();
  }
  return null;
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  let imported = 0;
  const errors: string[] = [];
  const baseCount = await db.client.count();

  for (const [index, row] of rows.entries()) {
    const corporateName = val(row, ["Razão social", "Razao social", "Razão Social", "corporateName", "Cliente"]);
    const document = val(row, ["CNPJ/CPF", "CNPJ", "CPF", "Documento", "document"]);
    if (!corporateName || !document) {
      errors.push(`Linha ${index + 2}: razão social e documento são obrigatórios.`);
      continue;
    }

    await db.client.upsert({
      where: { document },
      update: {
        corporateName,
        tradeName: val(row, ["Nome fantasia", "Nome Fantasia", "tradeName"]),
        taxRegime: val(row, ["Regime tributário", "Regime tributario", "Regime Tributário", "taxRegime", "Regime"]) || "Não informado",
        contactName: val(row, ["Responsável", "Responsavel", "contactName"]),
        primaryEmail: val(row, ["E-mail principal", "Email principal", "email", "E-mails", "primaryEmail"]),
        financialEmail: val(row, ["E-mail financeiro", "Email financeiro", "financialEmail"]),
        phone: val(row, ["Telefone", "phone"]),
        whatsapp: val(row, ["WhatsApp", "whatsapp"]),
        address: val(row, ["Endereço", "Endereco", "address"]),
        city: val(row, ["Cidade", "city"]),
        state: val(row, ["Estado", "state"]),
        notes: val(row, ["Observações", "Observacoes", "notes"]),
        stateRegistration: val(row, ["Inscrição estadual", "Inscricao estadual", "stateRegistration"]),
        municipalRegistration: val(row, ["Inscrição municipal", "Inscricao municipal", "municipalRegistration"]),
      },
      create: {
        internalCode: `CLI-${String(baseCount + imported + 1).padStart(3, "0")}`,
        corporateName,
        document,
        tradeName: val(row, ["Nome fantasia", "Nome Fantasia", "tradeName"]),
        taxRegime: val(row, ["Regime tributário", "Regime tributario", "Regime Tributário", "taxRegime", "Regime"]) || "Não informado",
        contactName: val(row, ["Responsável", "Responsavel", "contactName"]),
        primaryEmail: val(row, ["E-mail principal", "Email principal", "email", "E-mails", "primaryEmail"]),
        financialEmail: val(row, ["E-mail financeiro", "Email financeiro", "financialEmail"]),
        phone: val(row, ["Telefone", "phone"]),
        whatsapp: val(row, ["WhatsApp", "whatsapp"]),
        address: val(row, ["Endereço", "Endereco", "address"]),
        city: val(row, ["Cidade", "city"]),
        state: val(row, ["Estado", "state"]),
        notes: val(row, ["Observações", "Observacoes", "notes"]),
        stateRegistration: val(row, ["Inscrição estadual", "Inscricao estadual", "stateRegistration"]),
        municipalRegistration: val(row, ["Inscrição municipal", "Inscricao municipal", "municipalRegistration"]),
      },
    });
    imported += 1;
  }

  await db.activityLog.create({
    data: {
      entityType: "client",
      entityId: "import",
      action: "Importou clientes via planilha",
      newValues: JSON.stringify({ imported, errors: errors.length }),
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  const wantsJson = req.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json({ imported, errors });
  }

  redirect(`/controlla/clients?ok=import_done&imported=${imported}&errors=${errors.length}`);
}
