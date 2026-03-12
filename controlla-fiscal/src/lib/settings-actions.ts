"use server";

import fs from "fs";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, logout } from "@/lib/auth";

const BACKUP_PATH_FILE = "/root/.openclaw/workspace/controlla-fiscal/.backup-path";

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/users");
  revalidatePath("/controlla/settings");
  revalidatePath("/controlla/users");
}

function backToSettings(tab: string, ok: string) {
  redirect(`/controlla/settings?tab=${tab}&ok=${ok}`);
}

export async function saveProfileAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão inválida.");

  await db.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      title: String(formData.get("title") || "").trim(),
    },
  });

  revalidateAll();
  backToSettings("profile", "settings_profile_saved");
}

export async function changePasswordAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Sessão inválida.");

  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw new Error("Senha atual inválida.");
  if (!next || next.length < 6) throw new Error("Nova senha deve ter no mínimo 6 caracteres.");
  if (next !== confirm) throw new Error("Confirmação da senha não confere.");

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  revalidateAll();
  backToSettings("security", "settings_password_saved");
}

export async function saveBackupPathAction(formData: FormData) {
  const rawPath = String(formData.get("backupPath") || "").trim();
  const backupPath = rawPath || "/root/Downloads";

  await db.setting.upsert({
    where: { key: "backup_path" },
    update: { value: backupPath },
    create: { key: "backup_path", value: backupPath },
  });

  fs.writeFileSync(BACKUP_PATH_FILE, backupPath + "\n", "utf8");

  await db.activityLog.create({
    data: {
      entityType: "setting",
      entityId: "backup_path",
      action: "Atualizou caminho de backup",
      newValues: JSON.stringify({ backupPath }),
    },
  });

  revalidateAll();
  backToSettings("office", "settings_backup_saved");
}

export async function saveOfficeSettingsAction(formData: FormData) {
  await db.setting.upsert({ where: { key: "office_name" }, update: { value: String(formData.get("officeName") || "") }, create: { key: "office_name", value: String(formData.get("officeName") || "") } });
  await db.setting.upsert({ where: { key: "office_document" }, update: { value: String(formData.get("officeDocument") || "") }, create: { key: "office_document", value: String(formData.get("officeDocument") || "") } });
  await db.setting.upsert({ where: { key: "office_phone" }, update: { value: String(formData.get("officePhone") || "") }, create: { key: "office_phone", value: String(formData.get("officePhone") || "") } });

  revalidateAll();
  backToSettings("office", "settings_office_saved");
}

export async function saveNotificationSettingsAction(formData: FormData) {
  const dailySummary = String(formData.get("dailySummary") || "") === "on";
  const dueAlerts = String(formData.get("dueAlerts") || "") === "on";

  await db.setting.upsert({ where: { key: "notify_daily_summary" }, update: { value: String(dailySummary) }, create: { key: "notify_daily_summary", value: String(dailySummary) } });
  await db.setting.upsert({ where: { key: "notify_due_alerts" }, update: { value: String(dueAlerts) }, create: { key: "notify_due_alerts", value: String(dueAlerts) } });

  revalidateAll();
  backToSettings("notifications", "settings_notifications_saved");
}

export async function createSubUserAction(formData: FormData) {
  const current = await getSessionUser();
  if (!current) throw new Error("Sessão inválida.");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const title = String(formData.get("title") || "").trim();
  const password = String(formData.get("password") || "");
  const roleRaw = String(formData.get("role") || "ASSISTENTE");
  const role = (Object.values(UserRole) as string[]).includes(roleRaw) ? (roleRaw as UserRole) : UserRole.ASSISTENTE;

  if (!name || !email || !password) throw new Error("Nome, e-mail e senha são obrigatórios.");
  if (current.role !== UserRole.ADMINISTRADOR && role === UserRole.ADMINISTRADOR) throw new Error("Apenas administrador pode criar outro administrador.");

  const permissions = JSON.stringify({
    dashboard: String(formData.get("perm_dashboard") || "") === "on",
    clients: String(formData.get("perm_clients") || "") === "on",
    declarations: String(formData.get("perm_declarations") || "") === "on",
    guides: String(formData.get("perm_guides") || "") === "on",
    reports: String(formData.get("perm_reports") || "") === "on",
    audit: String(formData.get("perm_audit") || "") === "on",
    users: String(formData.get("perm_users") || "") === "on",
    settings: String(formData.get("perm_settings") || "") === "on",
    manageUsers: String(formData.get("perm_manage_users") || "") === "on",
    deleteRecords: String(formData.get("perm_delete") || "") === "on",
  });

  await db.user.create({
    data: {
      name,
      email,
      title,
      role,
      managerId: current.id,
      passwordHash: await bcrypt.hash(password, 10),
      permissions,
      active: true,
    },
  });

  revalidateAll();
  backToSettings("access", "settings_user_created");
}

export async function updateUserPermissionsAction(formData: FormData) {
  const current = await getSessionUser();
  if (!current || current.role !== UserRole.ADMINISTRADOR) throw new Error("Somente administrador pode alterar permissões.");

  const userId = String(formData.get("userId") || "");
  if (!userId) throw new Error("Usuário inválido.");

  const permissions = JSON.stringify({
    dashboard: String(formData.get("perm_dashboard") || "") === "on",
    clients: String(formData.get("perm_clients") || "") === "on",
    declarations: String(formData.get("perm_declarations") || "") === "on",
    guides: String(formData.get("perm_guides") || "") === "on",
    reports: String(formData.get("perm_reports") || "") === "on",
    audit: String(formData.get("perm_audit") || "") === "on",
    users: String(formData.get("perm_users") || "") === "on",
    settings: String(formData.get("perm_settings") || "") === "on",
    manageUsers: String(formData.get("perm_manage_users") || "") === "on",
    deleteRecords: String(formData.get("perm_delete") || "") === "on",
  });

  await db.user.update({ where: { id: userId }, data: { permissions } });
  revalidateAll();
  backToSettings("access", "settings_permissions_saved");
}

export async function resetProgramAction(formData: FormData) {
  const confirm1 = String(formData.get("confirm1") || "").trim();
  const confirm2 = String(formData.get("confirm2") || "").trim();

  if (confirm1 !== "RESETAR" || confirm2 !== "LIMPAR TUDO") {
    redirect("/controlla/settings?tab=security&error=confirmacao");
  }

  await db.$transaction(async (tx) => {
    await tx.guideSendHistory.deleteMany({});
    await tx.attachment.deleteMany({});
    await tx.declaration.deleteMany({});
    await tx.installmentGuide.deleteMany({});
    await tx.client.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.activityLog.deleteMany({});
    await tx.activityLog.create({ data: { entityType: "system", entityId: "reset", action: "Resetou dados operacionais do sistema" } });
  });

  revalidatePath("/dashboard");
  revalidatePath("/clients");
  revalidatePath("/declarations");
  revalidatePath("/guides");
  revalidatePath("/pending");
  revalidatePath("/reports");
  revalidatePath("/audit");
  revalidatePath("/settings");
  revalidatePath("/controlla/dashboard");
  revalidatePath("/controlla/clients");
  revalidatePath("/controlla/declarations");
  revalidatePath("/controlla/guides");
  revalidatePath("/controlla/pending");
  revalidatePath("/controlla/reports");
  revalidatePath("/controlla/audit");
  revalidatePath("/controlla/settings");
  backToSettings("security", "settings_reset_done");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
