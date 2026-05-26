import { AlertCircle, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { APP_NAME } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";

const ic = "h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-[#096136]/60 focus:ring-2 focus:ring-[#096136]/20";
const primaryBtn = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#096136] to-[#0c7844] text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#0e1916] via-[#111f1b] to-[#090e0c] px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-[#096136]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-[#0d7840]/10 blur-[80px]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-2xl bg-[#096136]/30 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#096136] ring-1 ring-[#096136]/50">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{APP_NAME}</h1>
            <p className="mt-0.5 text-sm text-white/40">Administration Portal</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-md">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/60">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="username"
                className={ic}
                placeholder="admin@kasa.app"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/60">{t("password")}</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={ic + " pr-11"}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/50"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs text-red-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? t("signingIn") : <>{t("signIn")} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-white/20">
            Authorized administrators only. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
