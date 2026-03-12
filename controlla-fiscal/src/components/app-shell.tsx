import Link from "next/link";
import { Bell, Building2, ClipboardList, FileText, Gauge, Search, Settings, ShieldCheck, Users, Wallet } from "lucide-react";
import { QueryToast } from "@/components/query-toast";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/settings-actions";
import { getSessionUser } from "@/lib/auth";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, perm: "dashboard" },
  { href: "/clients", label: "Clientes", icon: Building2, perm: "clients" },
  { href: "/declarations", label: "Declarações", icon: FileText, perm: "declarations" },
  { href: "/guides", label: "Guias", icon: Wallet, perm: "guides" },
  { href: "/pending", label: "Pendências", icon: ClipboardList, perm: "dashboard" },
  { href: "/reports", label: "Relatórios", icon: FileText, perm: "reports" },
  { href: "/audit", label: "Auditoria", icon: ShieldCheck, perm: "audit" },
  { href: "/users", label: "Usuários", icon: Users, perm: "users" },
  { href: "/settings", label: "Configurações", icon: Settings, perm: "settings" },
  { href: "/trash", label: "Lixeira", icon: ClipboardList, perm: "deleteRecords" },
];

function can(raw: string | null | undefined, key: string) {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed[key];
  } catch {
    return true;
  }
}

export async function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <QueryToast />
      <div className="grid min-h-screen lg:grid-cols-[272px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-slate-950 text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Controlla Fiscal</div>
            <div className="mt-3 text-2xl font-semibold">Painel Contábil SaaS</div>
            <p className="mt-2 text-sm text-slate-400">Controle operacional, rastreabilidade e produtividade do escritório.</p>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-6">
            {navigation.filter((n) => can(user?.permissions, n.perm)).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white">
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4 text-xs text-slate-400">
            Desenvolvido por <span className="font-semibold text-slate-200">JC Coding</span> • © 2026 Todos os direitos reservados.
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                <p className="text-sm text-slate-500">SaaS de gestão contábil, fiscal e operacional</p>
              </div>
              <div className="flex w-full flex-col gap-3 lg:w-auto">
                <div className="flex items-center justify-between gap-3">
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Bell size={18} />
                  </button>
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-white shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-semibold">{(user?.name || "U").slice(0,1).toUpperCase()}</div>
                    <div>
                      <div className="text-sm font-semibold">{user?.name || "Usuário"}</div>
                      <div className="text-xs text-slate-300">{user?.role || "Perfil"}</div>
                    </div>
                    <form action={logoutAction}>
                      <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Sair</button>
                    </form>
                  </div>
                </div>

                <form action="/controlla/search" method="get" className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 shadow-sm">
                  <Search size={16} />
                  <input name="q" placeholder="Buscar cliente, CNPJ, obrigação ou guia..." className="min-w-0 flex-1 bg-transparent py-1 outline-none" />
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">Buscar</button>
                </form>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Menu</summary>
              <nav className="mt-3 grid grid-cols-2 gap-2">
                {navigation.filter((n) => can(user?.permissions, n.perm)).map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <Icon size={15} />
                    {label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>

          <main className="flex-1 p-3 lg:p-8">{children}</main>
          <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 lg:px-8">
            Desenvolvido por <span className="font-semibold text-slate-700">JC Coding</span> • © 2026 Todos os direitos reservados.
          </footer>
        </div>
      </div>
    </div>
  );
}
