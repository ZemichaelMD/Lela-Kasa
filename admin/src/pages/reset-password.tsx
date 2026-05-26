import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.png";
import { APP_NAME } from "@/lib/data";
import { sdk } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { useI18n } from "@/lib/i18n";

const ic = "h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-[#096136]/60 focus:ring-2 focus:ring-[#096136]/20";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) { setError(t("missingResetToken")); return; }
    if (password !== confirm) { setError(t("passwordsDoNotMatch")); return; }
    setSubmitting(true);
    try {
      await sdk.auth.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resetFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#0e1916] via-[#111f1b] to-[#090e0c] px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-[#096136]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-[#0d7840]/10 blur-[80px]" />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-md">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <div className="absolute inset-0 scale-110 rounded-2xl bg-[#096136]/30 blur-2xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#096136] ring-1 ring-[#096136]/50">
                <img src={logo} alt={APP_NAME} className="h-8 w-8 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{APP_NAME} admin</h1>
              <p className="mt-0.5 text-sm text-white/40">{t("setNewPassword")}</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#096136]/15 ring-1 ring-[#096136]/30">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">{t("passwordUpdatedRedirecting")}</p>
                <p className="mt-1 text-xs text-white/40">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-white/60">{t("newPassword")}</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={ic + " pr-11"}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/50" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-medium text-white/60">{t("confirmNewPassword")}</label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={ic + " pr-11"}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/50" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs text-red-400" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#096136] to-[#0c7844] text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t("updating") : t("setNewPassword")}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs">
            <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">{t("backToSignIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
