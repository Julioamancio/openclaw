import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function InternalLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <AppShell title="Controlla Fiscal">{children}</AppShell>;
}
