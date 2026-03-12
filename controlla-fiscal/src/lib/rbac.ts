import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export function hasPermission(raw: string | null | undefined, key: string) {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed[key];
  } catch {
    return true;
  }
}

export async function requirePermission(key: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.permissions, key)) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}
