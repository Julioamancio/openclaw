import type { Declaration, InstallmentGuide } from "@prisma/client";

export function resolveDeclarationStatus(item: Pick<Declaration, "status" | "dueDate" | "deliveredAt">) {
  if (item.status === "Cancelado") return "Cancelado";
  if (item.deliveredAt) return item.deliveredAt > item.dueDate ? "Entregue em atraso" : "Entregue";
  if (item.dueDate < new Date() && !["Entregue", "Entregue em atraso", "Cancelado"].includes(item.status)) return "Atrasado";
  return item.status;
}

export function resolveGuideStatus(item: Pick<InstallmentGuide, "status" | "dueDate" | "receiptConfirmed" | "paymentStatus">) {
  if (item.paymentStatus === "Pago" || item.status === "Pago") return "Pago";
  if (item.dueDate < new Date() && !item.receiptConfirmed && item.status !== "Pago") return "Vencido";
  return item.status;
}
