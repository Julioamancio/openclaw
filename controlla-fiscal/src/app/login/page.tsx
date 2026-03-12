import { LoginForm } from "@/components/login-form";
import { loginAction } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6">
      {params.error ? <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Credenciais inválidas.</div> : null}
      <LoginForm action={loginAction} />
    </div>
  );
}
