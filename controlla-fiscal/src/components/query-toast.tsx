"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const mapOk: Record<string, string> = {
  client_created: "Cliente salvo com sucesso.",
  client_updated: "Cliente atualizado com sucesso.",
  declaration_created: "Declaração salva com sucesso.",
  declaration_updated: "Declaração atualizada com sucesso.",
  guide_created: "Guia salva com sucesso.",
  guide_updated: "Guia atualizada com sucesso.",
  import_done: "Importação concluída com sucesso.",
  settings_profile_saved: "Perfil salvo com sucesso.",
  settings_password_saved: "Senha atualizada com sucesso.",
  settings_office_saved: "Dados do escritório salvos com sucesso.",
  settings_backup_saved: "Caminho de backup salvo com sucesso.",
  settings_notifications_saved: "Notificações salvas com sucesso.",
  settings_user_created: "Usuário criado com sucesso.",
  settings_permissions_saved: "Permissões salvas com sucesso.",
  settings_reset_done: "Reset do sistema concluído com sucesso.",
  user_created: "Usuário criado com sucesso.",
  user_updated: "Usuário atualizado com sucesso.",
  user_deleted: "Usuário excluído com sucesso.",
};

export function QueryToast() {
  const params = useSearchParams();
  const [visible, setVisible] = useState(true);

  const msg = useMemo(() => {
    const ok = params.get("ok") || "";
    const error = params.get("error") || "";
    if (error === "confirmacao") return { tone: "error", text: "Confirmação inválida para reset." };
    if (error === "required_client") return { tone: "error", text: "Preencha Razão Social e CNPJ/CPF." };
    if (error === "required_declaration") return { tone: "error", text: "Preencha competência e data limite da declaração." };
    if (error === "required_guide") return { tone: "error", text: "Preencha órgão, valor e vencimento da guia." };
    if (error === "invalid_document") return { tone: "error", text: "CNPJ/CPF inválido." };
    if (error === "import_failed") return { tone: "error", text: "Falha ao importar planilha." };
    if (error === "user_forbidden") return { tone: "error", text: "Sem permissão para gerenciar usuários." };
    if (error === "user_required") return { tone: "error", text: "Preencha os campos obrigatórios do usuário." };
    if (error === "user_self_delete") return { tone: "error", text: "Você não pode excluir seu próprio usuário." };
    if (error === "user_delete_failed") return { tone: "error", text: "Falha ao excluir usuário (há vínculos pendentes)." };
    if (!ok) return null;
    if (ok === "import_done") {
      const imported = Number(params.get("imported") || "0");
      const errors = Number(params.get("errors") || "0");
      return { tone: errors > 0 ? "warn" : "success", text: `Importação concluída: ${imported} importado(s)${errors ? `, ${errors} erro(s)` : ""}.` };
    }
    return { tone: "success", text: mapOk[ok] || "Operação concluída." };
  }, [params]);

  useEffect(() => {
    setVisible(true);
    if (!msg) return;
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg || !visible) return null;

  const cls = msg.tone === "error"
    ? "border-rose-300 bg-rose-50 text-rose-700"
    : msg.tone === "warn"
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : "border-emerald-300 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${cls}`}>
      {msg.text}
    </div>
  );
}
