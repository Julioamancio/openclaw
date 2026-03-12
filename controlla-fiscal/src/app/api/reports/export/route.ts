import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { resolveDeclarationStatus, resolveGuideStatus } from "@/lib/status";

function csv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function styleBody(ws: ExcelJS.Worksheet, from: number, to: number) {
  for (let r = from; r <= to; r++) {
    const row = ws.getRow(r);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (r % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  }
}

async function asXlsx(type: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Painel Contábil de Entregas";
  wb.created = new Date();

  const summary = wb.addWorksheet("Resumo Executivo", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  summary.mergeCells("A1:F1");
  summary.getCell("A1").value = "Painel Contábil de Entregas — Relatório Executivo";
  summary.getCell("A1").font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  summary.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };

  summary.mergeCells("A2:F2");
  summary.getCell("A2").value = `Gerado em: ${new Date().toLocaleString("pt-BR")}`;
  summary.getCell("A2").alignment = { horizontal: "center" };
  summary.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };

  const [clientsCount, declarations, guides] = await Promise.all([
    db.client.count({ where: { deletedAt: null } }),
    db.declaration.findMany({ where: { deletedAt: null }, include: { client: true, declarationType: true, owner: true }, orderBy: { dueDate: "asc" } }),
    db.installmentGuide.findMany({ where: { deletedAt: null }, include: { client: true, installmentType: true, owner: true }, orderBy: { dueDate: "asc" } }),
  ]);

  const pendingDeclarations = declarations.filter((d) => ["Pendente", "Em andamento", "Revisão interna", "Aguardando documentos do cliente", "Atrasado"].includes(resolveDeclarationStatus(d as any))).length;
  const lateDeclarations = declarations.filter((d) => ["Atrasado", "Entregue em atraso"].includes(resolveDeclarationStatus(d as any))).length;
  const pendingGuides = guides.filter((g) => ["Não enviado", "Preparado para envio", "Pendente de retorno"].includes(resolveGuideStatus(g as any))).length;
  const overdueGuides = guides.filter((g) => resolveGuideStatus(g as any) === "Vencido").length;

  summary.addRow([]);
  summary.addRow(["Indicador", "Valor", "", "Indicador", "Valor", ""]);
  const hr = summary.lastRow!;
  styleHeader(hr);

  summary.addRow(["Clientes", clientsCount, "", "Declarações", declarations.length, ""]);
  summary.addRow(["Declarações pendentes", pendingDeclarations, "", "Declarações atrasadas", lateDeclarations, ""]);
  summary.addRow(["Guias", guides.length, "", "Guias pendentes", pendingGuides, ""]);
  summary.addRow(["Guias vencidas", overdueGuides, "", "", "", ""]);

  styleBody(summary, 5, 8);
  summary.columns = [{ width: 30 }, { width: 14 }, { width: 4 }, { width: 30 }, { width: 14 }, { width: 4 }];

  if (type === "declarations" || type === "summary") {
    const ws = wb.addWorksheet("Declarações", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Tipo", key: "tipo", width: 18 },
      { header: "Competência", key: "comp", width: 14 },
      { header: "Ano-base", key: "ano", width: 10 },
      { header: "Prazo", key: "prazo", width: 12 },
      { header: "Entrega", key: "entrega", width: 12 },
      { header: "Status", key: "status", width: 20 },
      { header: "Prioridade", key: "prioridade", width: 12 },
      { header: "Responsável", key: "resp", width: 18 },
      { header: "Protocolo", key: "prot", width: 16 },
      { header: "Observações", key: "obs", width: 36 },
    ];
    styleHeader(ws.getRow(1));

    declarations.forEach((d) => {
      ws.addRow({
        cliente: d.client.tradeName || d.client.corporateName,
        tipo: d.declarationType.name,
        comp: d.competence,
        ano: d.yearBase || "",
        prazo: d.dueDate.toISOString().slice(0, 10),
        entrega: d.deliveredAt ? d.deliveredAt.toISOString().slice(0, 10) : "",
        status: resolveDeclarationStatus(d as any),
        prioridade: d.priority,
        resp: d.owner?.name || "",
        prot: d.protocol || "",
        obs: d.notes || "",
      });
    });

    styleBody(ws, 2, ws.rowCount);
    ws.autoFilter = { from: "A1", to: "K1" };
    ws.addRow([]);
    const totalRow = ws.addRow(["TOTAL", { formula: `COUNTA(A2:A${ws.rowCount - 1})` }]);
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).font = { bold: true };
  }

  if (type === "guides" || type === "summary") {
    const ws = wb.addWorksheet("Guias", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Tipo Parcelamento", key: "tipo", width: 20 },
      { header: "Órgão", key: "orgao", width: 18 },
      { header: "Nº Parcelamento", key: "num", width: 18 },
      { header: "Competência", key: "comp", width: 14 },
      { header: "Parcela", key: "parcela", width: 10 },
      { header: "Valor", key: "valor", width: 14 },
      { header: "Vencimento", key: "vencto", width: 12 },
      { header: "Envio", key: "envio", width: 12 },
      { header: "Forma Envio", key: "forma", width: 15 },
      { header: "Status", key: "status", width: 22 },
      { header: "Pagamento", key: "pag", width: 14 },
      { header: "Responsável", key: "resp", width: 18 },
    ];

    styleHeader(ws.getRow(1));

    guides.forEach((g) => {
      ws.addRow({
        cliente: g.client.tradeName || g.client.corporateName,
        tipo: g.installmentType.name,
        orgao: g.agency,
        num: g.agreementNumber || "",
        comp: g.reference || "",
        parcela: g.installmentNumber || "",
        valor: g.amount,
        vencto: g.dueDate.toISOString().slice(0, 10),
        envio: g.sentAt ? g.sentAt.toISOString().slice(0, 10) : "",
        forma: g.deliveryMethod || "",
        status: resolveGuideStatus(g as any),
        pag: g.paymentStatus || "",
        resp: g.owner?.name || "",
      });
    });

    ws.getColumn("valor").numFmt = 'R$ #,##0.00';
    styleBody(ws, 2, ws.rowCount);
    ws.autoFilter = { from: "A1", to: "M1" };
    ws.addRow([]);
    const totalRow = ws.addRow(["TOTAL VALOR", "", "", "", "", "", { formula: `SUM(G2:G${ws.rowCount - 1})` }]);
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(7).numFmt = 'R$ #,##0.00';
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename=${type === "summary" ? "resumo_executivo" : type}.xlsx`,
    },
  });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.permissions, "reports")) {
    return new NextResponse("Sem permissão", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "summary";
  const format = (searchParams.get("format") || "xlsx").toLowerCase();

  if (format === "csv") {
    // fallback simples para compatibilidade
    if (type === "summary") {
      return new NextResponse(csv([["Formato"], ["Use format=xlsx para relatório profissional"]]), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=resumo.csv" },
      });
    }
  }

  return asXlsx(type);
}
