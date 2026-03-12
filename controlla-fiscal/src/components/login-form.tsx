"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function LoginForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Controlla Fiscal</div>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">Entrar no sistema</h1>
      <p className="mt-2 text-sm text-slate-500">Use o usuário demo: daniela@controlla.com / admin123</p>
      <div className="mt-6 space-y-4">
        <input name="email" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="E-mail" defaultValue="daniela@controlla.com" />
        <div className="relative">
          <input name="password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12" placeholder="Senha" type={showPassword ? "text" : "password"} defaultValue="admin123" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white">Acessar</button>
      </div>
    </form>
  );
}
