import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  changePasswordAction,
  createSubUserAction,
  resetProgramAction,
  saveBackupPathAction,
  saveNotificationSettingsAction,
  saveOfficeSettingsAction,
  saveProfileAction,
  updateUserPermissionsAction,
} from "@/lib/settings-actions";

const tabs = [
  { key: "profile", label: "Meu Perfil" },
  { key: "office", label: "Dados do Escritório" },
  { key: "notifications", label: "Notificações" },
  { key: "security", label: "Segurança" },
  { key: "access", label: "Acesso e Permissões" },
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  await requirePermission("settings");
  const currentUser = await getSessionUser();
  const params = await searchParams;
  const activeTab = tabs.some((t) => t.key === params.tab) ? (params.tab as (typeof tabs)[number]["key"]) : "profile";

  const [backupSetting, officeName, officeDoc, officePhone, notifyDaily, notifyDue, users] = await Promise.all([
    db.setting.findUnique({ where: { key: "backup_path" } }),
    db.setting.findUnique({ where: { key: "office_name" } }),
    db.setting.findUnique({ where: { key: "office_document" } }),
    db.setting.findUnique({ where: { key: "office_phone" } }),
    db.setting.findUnique({ where: { key: "notify_daily_summary" } }),
    db.setting.findUnique({ where: { key: "notify_due_alerts" } }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const backupPath = backupSetting?.value || "/root/Downloads";

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 px-2 text-sm font-semibold text-slate-800">Configurações</div>
        <div className="space-y-1">
          {tabs.map((tab) => (
            <Link key={tab.key} href={`/settings?tab=${tab.key}`} className={`block rounded-xl px-3 py-2 text-sm ${activeTab === tab.key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
              {tab.label}
            </Link>
          ))}
        </div>
      </aside>

      <div className="space-y-6">
        {params.error === "confirmacao" ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Confirmação inválida no reset. Digite exatamente <b>RESETAR</b> e <b>LIMPAR TUDO</b>.
          </div>
        ) : null}
        {activeTab === "profile" && (
          <Panel title="Informações Pessoais" subtitle="Atualize seus dados pessoais.">
            <form action={saveProfileAction} className="grid gap-3 md:grid-cols-2">
              <input name="name" defaultValue={currentUser?.name || ""} placeholder="Nome Completo" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="email" defaultValue={currentUser?.email || ""} placeholder="E-mail" className="rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="title" defaultValue={currentUser?.title || ""} placeholder="Cargo / Função" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
              <button className="rounded-2xl bg-blue-600 px-4 py-3 text-white md:col-span-2">Salvar Alterações</button>
            </form>
          </Panel>
        )}

        {activeTab === "office" && (
          <>
            <Panel title="Dados do Escritório" subtitle="Informações da empresa de contabilidade.">
              <form action={saveOfficeSettingsAction} className="grid gap-3 md:grid-cols-2">
                <input name="officeName" defaultValue={officeName?.value || ""} placeholder="Razão Social" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
                <input name="officeDocument" defaultValue={officeDoc?.value || ""} placeholder="CNPJ" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input name="officePhone" defaultValue={officePhone?.value || ""} placeholder="Telefone Principal" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <button className="rounded-2xl bg-blue-600 px-4 py-3 text-white md:col-span-2">Salvar Alterações</button>
              </form>
            </Panel>

            <Panel title="Backup automático" subtitle="Backup completo a cada 1 hora">
              <form action={saveBackupPathAction} className="space-y-3">
                <input name="backupPath" defaultValue={backupPath} placeholder="/mnt/backups/controlla" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <p className="text-xs text-slate-500">Se vazio, o backup cai em <b>/root/Downloads</b>.</p>
                <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">Salvar caminho de backup</button>
              </form>
            </Panel>
          </>
        )}

        {activeTab === "notifications" && (
          <Panel title="Preferências de Notificação" subtitle="Escolha como deseja ser avisado.">
            <form action={saveNotificationSettingsAction} className="space-y-4">
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"><span>Resumo Diário</span><input type="checkbox" name="dailySummary" defaultChecked={notifyDaily?.value === "true"} /></label>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"><span>Alertas de Vencimento</span><input type="checkbox" name="dueAlerts" defaultChecked={notifyDue?.value === "true"} /></label>
              <button className="rounded-2xl bg-blue-600 px-4 py-3 text-white">Salvar Alterações</button>
            </form>
          </Panel>
        )}

        {activeTab === "security" && (
          <>
            <Panel title="Segurança" subtitle="Gerencie sua senha e métodos de autenticação.">
              <form action={changePasswordAction} className="grid gap-3 md:grid-cols-2">
                <input type="password" name="currentPassword" placeholder="Senha Atual" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
                <input type="password" name="newPassword" placeholder="Nova Senha" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input type="password" name="confirmPassword" placeholder="Confirmar Nova Senha" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <button className="rounded-2xl bg-blue-600 px-4 py-3 text-white md:col-span-2">Atualizar Senha</button>
              </form>
            </Panel>

            <Panel title="Resetar programa" subtitle="Limpa os dados operacionais com confirmação dupla">
              <form action={resetProgramAction} className="space-y-3">
                <input name="confirm1" placeholder="Digite RESETAR" className="w-full rounded-2xl border border-amber-300 px-4 py-3 text-sm" />
                <input name="confirm2" placeholder="Digite LIMPAR TUDO" className="w-full rounded-2xl border border-amber-300 px-4 py-3 text-sm" />
                <button className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">Resetar programa</button>
              </form>
            </Panel>
          </>
        )}

        {activeTab === "access" && (
          <>
            <Panel title="Criar usuário subordinado" subtitle="Usuários podem criar outros abaixo deles; Admin controla permissões.">
              <form action={createSubUserAction} className="grid gap-3 md:grid-cols-2">
                <input name="name" placeholder="Nome" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input name="email" placeholder="E-mail" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input name="title" placeholder="Cargo" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input name="password" type="password" placeholder="Senha inicial" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <select name="role" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" defaultValue="ASSISTENTE">
                  <option value="ASSISTENTE">ASSISTENTE</option>
                  <option value="CONTADOR">CONTADOR</option>
                  {currentUser?.role === UserRole.ADMINISTRADOR ? <option value="ADMINISTRADOR">ADMINISTRADOR</option> : null}
                  <option value="VISUALIZADOR">VISUALIZADOR</option>
                </select>

                <div className="rounded-2xl border border-slate-200 p-3 md:col-span-2">
                  <div className="mb-2 text-sm font-medium">Permissões iniciais</div>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <label><input type="checkbox" name="perm_dashboard" defaultChecked /> Dashboard</label>
                    <label><input type="checkbox" name="perm_clients" defaultChecked /> Clientes</label>
                    <label><input type="checkbox" name="perm_declarations" defaultChecked /> Declarações</label>
                    <label><input type="checkbox" name="perm_guides" defaultChecked /> Guias</label>
                    <label><input type="checkbox" name="perm_reports" defaultChecked /> Relatórios</label>
                    <label><input type="checkbox" name="perm_audit" /> Auditoria</label>
                    <label><input type="checkbox" name="perm_users" /> Usuários</label>
                    <label><input type="checkbox" name="perm_settings" /> Configurações</label>
                    <label><input type="checkbox" name="perm_manage_users" /> Gerenciar usuários</label>
                    <label><input type="checkbox" name="perm_delete" /> Excluir registros</label>
                  </div>
                </div>

                <button className="rounded-2xl bg-blue-600 px-4 py-3 text-white md:col-span-2">Criar usuário</button>
              </form>
            </Panel>

            {currentUser?.role === UserRole.ADMINISTRADOR && (
              <Panel title="Permissões por usuário" subtitle="Administrador define o que cada usuário pode ver/fazer.">
                <form action={updateUserPermissionsAction} className="space-y-3">
                  <select name="userId" className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>

                  <div className="grid gap-2 md:grid-cols-3 text-sm rounded-2xl border border-slate-200 p-3">
                    <label><input type="checkbox" name="perm_dashboard" defaultChecked /> Dashboard</label>
                    <label><input type="checkbox" name="perm_clients" defaultChecked /> Clientes</label>
                    <label><input type="checkbox" name="perm_declarations" defaultChecked /> Declarações</label>
                    <label><input type="checkbox" name="perm_guides" defaultChecked /> Guias</label>
                    <label><input type="checkbox" name="perm_reports" defaultChecked /> Relatórios</label>
                    <label><input type="checkbox" name="perm_audit" /> Auditoria</label>
                    <label><input type="checkbox" name="perm_users" /> Usuários</label>
                    <label><input type="checkbox" name="perm_settings" /> Configurações</label>
                    <label><input type="checkbox" name="perm_manage_users" /> Gerenciar usuários</label>
                    <label><input type="checkbox" name="perm_delete" /> Excluir registros</label>
                  </div>

                  <button className="rounded-2xl bg-blue-600 px-4 py-3 text-white">Salvar permissões</button>
                </form>
              </Panel>
            )}
          </>
        )}

        <Panel title="Ações rápidas" subtitle="Acesso direto para backup e reset">
          <div className="flex flex-wrap gap-2">
            <Link href="/settings?tab=office" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">Ir para Backup</Link>
            <Link href="/settings?tab=security" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">Ir para Resetar Programa</Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
