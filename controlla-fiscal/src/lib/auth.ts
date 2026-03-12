import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const SESSION_COOKIE = "controlla_session";

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) return false;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return false;

  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, name: user.name })).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, payload, { httpOnly: true, sameSite: "lax", path: "/", secure: false, maxAge: 60 * 60 * 8 });
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return db.user.findUnique({ where: { id: parsed.id } });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
