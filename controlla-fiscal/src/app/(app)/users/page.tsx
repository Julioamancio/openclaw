import { UserRole } from "@prisma/client";
import { FormSubmit } from "@/components/form-submit";
import { Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { createUserAdminAction, deleteUserAdminAction, updateUserAdminAction } from "@/lib/user-admin-actions";

export default async function UsersPage() {
  await requirePermission("users");
  const current = await getSessionUser();
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  const isAdmin = current?.role === UserRole.ADMINISTRADOR;

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <Panel title="Criar novo usuário" subtitle="Cadastro direto de usuários pelo administrador">
          <form action={createUserAdminAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input name="name" placeholder="Nome" className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="email" placeholder="E-mail" className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="password" type="password" placeholder="Senha inicial" className="rounded-xl border border-slate-200 px-3 py-2" />
            <select name="role" className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="ASSISTENTE">ASSISTENTE</option>
              <option value="CONTADOR">CONTADOR</option>
              <option value="VISUALIZADOR">VISUALIZADOR</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            </select>
            <FormSubmit label="Criar usuário" pendingLabel="Criando..." className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white xl:col-span-4 disabled:opacity-60" />
          </form>
        </Panel>
      ) : null}

      <Panel title="Usuários e permissões" subtitle="Perfis e governança do sistema">
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {isAdmin ? (
                <form action={updateUserAdminAction} className="grid gap-2 md:grid-cols-5">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="name" defaultValue={u.name} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <input name="email" defaultValue={u.email} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <select name="role" defaultValue={u.role} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="ASSISTENTE">ASSISTENTE</option>
                    <option value="CONTADOR">CONTADOR</option>
                    <option value="VISUALIZADOR">VISUALIZADOR</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  </select>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} /> Ativo</label>
                  <div className="flex gap-2 md:col-span-5">
                    <FormSubmit label="Salvar" pendingLabel="Salvando..." className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 disabled:opacity-60" />
                  </div>
                </form>
              ) : (
                <div className="grid gap-1 text-sm md:grid-cols-4">
                  <div><span className="text-slate-500">Nome:</span> {u.name}</div>
                  <div><span className="text-slate-500">E-mail:</span> {u.email}</div>
                  <div><span className="text-slate-500">Perfil:</span> {u.role}</div>
                  <div><span className="text-slate-500">Status:</span> {u.active ? "Ativo" : "Inativo"}</div>
                </div>
              )}

              {isAdmin ? (
                <form action={deleteUserAdminAction} className="mt-2">
                  <input type="hidden" name="id" value={u.id} />
                  <FormSubmit label="Excluir usuário" pendingLabel="Excluindo..." className="rounded-lg border border-rose-400 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-60" />
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
