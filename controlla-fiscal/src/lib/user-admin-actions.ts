"use server";

import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function requireAdmin() {
  const current = await getSessionUser();
  if (!current || current.role !== UserRole.ADMINISTRADOR) {
    redirect("/users?error=user_forbidden");
  }
  return current;
}

export async function createUserAdminAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const roleRaw = String(formData.get("role") || "ASSISTENTE");
  const role = (Object.values(UserRole) as string[]).includes(roleRaw) ? (roleRaw as UserRole) : UserRole.ASSISTENTE;

  if (!name || !email || !password) {
    redirect("/users?error=user_required");
  }

  await db.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      active: true,
    },
  });

  revalidatePath("/controlla/users");
  redirect("/users?ok=user_created");
}

export async function updateUserAdminAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") || "ASSISTENTE");
  const role = (Object.values(UserRole) as string[]).includes(roleRaw) ? (roleRaw as UserRole) : UserRole.ASSISTENTE;
  const active = String(formData.get("active") || "") === "on";

  if (!id || !name || !email) {
    redirect("/users?error=user_required");
  }

  await db.user.update({
    where: { id },
    data: { name, email, role, active },
  });

  revalidatePath("/controlla/users");
  redirect("/users?ok=user_updated");
}

export async function deleteUserAdminAction(formData: FormData) {
  const current = await requireAdmin();

  const id = String(formData.get("id") || "");
  if (!id) redirect("/users?error=user_required");
  if (id === current.id) redirect("/users?error=user_self_delete");

  try {
    await db.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { managerId: id }, data: { managerId: null } });
      await tx.declaration.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
      await tx.installmentGuide.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
      await tx.activityLog.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.user.delete({ where: { id } });
    });
  } catch {
    redirect("/users?error=user_delete_failed");
  }

  revalidatePath("/controlla/users");
  redirect("/users?ok=user_deleted");
}
