import { ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { APP_NAME } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";

const ic = "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, refreshMe } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirect = params.get("redirect");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate(redirect || "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signInFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">{APP_NAME}</h1>
            <p className="text-sm text-slate-400">Administration Portal</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-7 shadow-xl backdrop-blur-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="username" className={ic + " bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"} placeholder="admin@kasa.app" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">{t("password")}</label>
              <div className="relative">
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required autoComplete="current-password" className={ic + " bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
            <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
              {submitting ? t("signingIn") : (<>{t("signIn")} <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Authorized administrators only. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
