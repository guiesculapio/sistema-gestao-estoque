import { useState } from "react";
import { Loader, UserPlus, AlertCircle, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);

    const result = await signUp(email, password);

    if (!result.success) {
      setError(result.error || "Não foi possível criar a conta. Tente novamente.");
      setSubmitting(false);
      return;
    }

    setRegisteredEmail(email);
    setSubmitting(false);
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h1 className="text-lg font-bold text-slate-800">Confirme seu email</h1>
            <p className="text-xs text-slate-500 mt-0.5">Falta só um passo</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-start gap-2">
              <MailCheck size={16} className="flex-shrink-0 mt-0.5" />
              <p>
                Enviamos um link de confirmação para{" "}
                <span className="font-semibold">{registeredEmail}</span>. Verifique
                sua caixa de entrada antes de fazer login.
              </p>
            </div>

            <a
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
            >
              Voltar para o login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-lg font-bold text-slate-800">Criar conta</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre-se com seu email e senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Email
            </label>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Senha
            </label>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Confirmar senha
            </label>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm disabled:bg-slate-100"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password || !confirmPassword}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors ${
              submitting || !email || !password || !confirmPassword
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
            }`}
          >
            {submitting ? (
              <>
                <Loader size={16} className="animate-spin" />
                Criando conta...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Criar conta grátis
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-500">
            Já tem uma conta?{" "}
            <a href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Entrar
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
