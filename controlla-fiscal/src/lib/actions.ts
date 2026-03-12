"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { isValidCpfOrCnpj } from "@/lib/validators";

async function logAction(entityType: string, entityId: string, action: string, newValues?: unknown) {
  const user = await getSessionUser();
  await db.activityLog.create({
    data: {
      userId: user?.id,
      entityType,
      entityId,
      action,
      newValues: newValues ? JSON.stringify(newValues) : null,
    },
  });
}

export async function createClientAction(formData: FormData) {
  await requirePermission("clients");
  const corporateName = String(formData.get("corporateName") || "").trim();
  const document = String(formData.get("document") || "").trim();
  if (!corporateName || !document) {
    redirect("/controlla/clients?error=required_client");
  }
  if (!isValidCpfOrCnpj(document)) {
    redirect("/controlla/clients?error=invalid_document");
  }

  const count = await db.client.count();
  const client = await db.client.create({
    data: {
      internalCode: `CLI-${String(count + 1).padStart(3, "0")}`,
      corporateName,
      tradeName: String(formData.get("tradeName") || ""),
      document,
      taxRegime: String(formData.get("taxRegime") || "Não informado"),
      contactName: String(formData.get("contactName") || ""),
      primaryEmail: String(formData.get("primaryEmail") || ""),
      financialEmail: String(formData.get("financialEmail") || ""),
      phone: String(formData.get("phone") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      notes: String(formData.get("notes") || ""),
    },
  });
  await logAction("client", client.id, "Criou cliente", client);
  revalidatePath("/clients");
  revalidatePath("/controlla/clients");
  redirect("/controlla/clients?ok=client_created");
}

export async function createDeclarationAction(formData: FormData) {
  await requirePermission("declarations");
  const competence = String(formData.get("competence") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  if (!competence || !dueDateRaw) {
    redirect("/controlla/declarations?error=required_declaration");
  }

  const declaration = await db.declaration.create({
    data: {
      clientId: String(formData.get("clientId")),
      declarationTypeId: String(formData.get("declarationTypeId")),
      competence,
      yearBase: Number(formData.get("yearBase")),
      dueDate: new Date(dueDateRaw),
      status: String(formData.get("status")),
      priority: String(formData.get("priority")),
      ownerId: String(formData.get("ownerId")),
      notes: String(formData.get("notes") || ""),
      protocol: String(formData.get("protocol") || "") || null,
    },
  });
  await logAction("declaration", declaration.id, "Criou declaração", declaration);
  revalidatePath("/declarations");
  revalidatePath("/dashboard");
  revalidatePath("/controlla/declarations");
  revalidatePath("/controlla/dashboard");
  redirect("/controlla/declarations?ok=declaration_created");
}

export async function createGuideAction(formData: FormData) {
  await requirePermission("guides");
  const agency = String(formData.get("agency") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  if (!agency || !dueDateRaw || !amount) {
    redirect("/controlla/guides?error=required_guide");
  }

  const guide = await db.installmentGuide.create({
    data: {
      clientId: String(formData.get("clientId")),
      installmentTypeId: String(formData.get("installmentTypeId")),
      agency,
      agreementNumber: String(formData.get("agreementNumber") || "") || null,
      reference: String(formData.get("reference") || "") || null,
      installmentNumber: Number(formData.get("installmentNumber") || 0),
      amount,
      dueDate: new Date(dueDateRaw),
      issuedAt: new Date(String(formData.get("issuedAt"))),
      deliveryMethod: String(formData.get("deliveryMethod") || "") || null,
      status: String(formData.get("status")),
      paymentStatus: String(formData.get("paymentStatus") || "Pendente"),
      ownerId: String(formData.get("ownerId")),
      notes: String(formData.get("notes") || ""),
    },
  });
  await logAction("guide", guide.id, "Criou guia de parcelamento", guide);
  revalidatePath("/guides");
  revalidatePath("/dashboard");
  revalidatePath("/controlla/guides");
  revalidatePath("/controlla/dashboard");
  redirect("/controlla/guides?ok=guide_created");
}

export async function updateClientAction(id: string, formData: FormData) {
  await requirePermission("clients");
  const client = await db.client.update({
    where: { id },
    data: {
      corporateName: String(formData.get("corporateName") || ""),
      tradeName: String(formData.get("tradeName") || ""),
      document: String(formData.get("document") || ""),
      taxRegime: String(formData.get("taxRegime") || "Não informado"),
      contactName: String(formData.get("contactName") || ""),
      primaryEmail: String(formData.get("primaryEmail") || ""),
      financialEmail: String(formData.get("financialEmail") || ""),
      phone: String(formData.get("phone") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      notes: String(formData.get("notes") || ""),
      portalUsername: String(formData.get("portalUsername") || ""),
      portalPassword: String(formData.get("portalPassword") || ""),
      portalSite: String(formData.get("portalSite") || ""),
      simplesNotes: String(formData.get("simplesNotes") || ""),
    },
  });
  await logAction("client", client.id, "Atualizou cliente", client);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/controlla/clients");
  revalidatePath(`/controlla/clients/${id}`);
  redirect("/controlla/clients?ok=client_updated");
}

export async function updateDeclarationAction(id: string, formData: FormData) {
  await requirePermission("declarations");
  const dueDate = new Date(String(formData.get("dueDate")));
  const deliveredRaw = String(formData.get("deliveredAt") || "");
  const deliveredAt = deliveredRaw ? new Date(deliveredRaw) : null;
  const computedStatus = deliveredAt ? (deliveredAt > dueDate ? "Entregue em atraso" : "Entregue") : String(formData.get("status"));
  const declaration = await db.declaration.update({
    where: { id },
    data: {
      clientId: String(formData.get("clientId")),
      declarationTypeId: String(formData.get("declarationTypeId")),
      competence: String(formData.get("competence")),
      yearBase: Number(formData.get("yearBase")),
      dueDate,
      deliveredAt,
      status: computedStatus,
      priority: String(formData.get("priority")),
      ownerId: String(formData.get("ownerId")),
      notes: String(formData.get("notes") || ""),
      protocol: String(formData.get("protocol") || "") || null,
    },
  });
  await logAction("declaration", declaration.id, "Atualizou declaração", declaration);
  revalidatePath("/declarations");
  revalidatePath("/dashboard");
  revalidatePath("/controlla/declarations");
  revalidatePath("/controlla/dashboard");
  redirect("/controlla/declarations?ok=declaration_updated");
}

export async function updateGuideAction(id: string, formData: FormData) {
  await requirePermission("guides");
  const guide = await db.installmentGuide.update({
    where: { id },
    data: {
      clientId: String(formData.get("clientId")),
      installmentTypeId: String(formData.get("installmentTypeId")),
      agency: String(formData.get("agency")),
      agreementNumber: String(formData.get("agreementNumber") || "") || null,
      reference: String(formData.get("reference") || "") || null,
      installmentNumber: Number(formData.get("installmentNumber") || 0),
      amount: Number(formData.get("amount")),
      dueDate: new Date(String(formData.get("dueDate"))),
      issuedAt: new Date(String(formData.get("issuedAt"))),
      sentAt: String(formData.get("sentAt") || "") ? new Date(String(formData.get("sentAt"))) : null,
      deliveryMethod: String(formData.get("deliveryMethod") || "") || null,
      status: String(formData.get("status")),
      paymentStatus: String(formData.get("paymentStatus") || "Pendente"),
      receiptConfirmed: String(formData.get("receiptConfirmed") || "") === "on",
      confirmationDate: String(formData.get("confirmationDate") || "") ? new Date(String(formData.get("confirmationDate"))) : null,
      ownerId: String(formData.get("ownerId")),
      notes: String(formData.get("notes") || ""),
    },
  });
  await logAction("guide", guide.id, "Atualizou guia", guide);
  revalidatePath("/guides");
  revalidatePath("/dashboard");
  revalidatePath("/controlla/guides");
  revalidatePath("/controlla/dashboard");
  redirect("/controlla/guides?ok=guide_updated");
}
