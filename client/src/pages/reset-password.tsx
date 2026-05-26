import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { APP_NAME } from "@/lib/data";
import { sdk } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/logo.png";

const ic = "h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm outline-none placeholder:text-muted-foreground/50 transition-all focus:border-[#096136]/50 focus:ring-2 focus:ring-[#096136]/20";

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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1d14] via-[#0f2419] to-[#07120d] px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-[#096136]/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-[#0d7840]/10 blur-[80px]" />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/95 p-7 shadow-2xl backdrop-blur-sm dark:border-white/[0.07] dark:bg-gray-950/95">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <div className="absolute inset-0 scale-110 rounded-2xl bg-[#096136]/25 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/20">
                <img src={logo} alt={APP_NAME} className="h-full w-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold">{APP_NAME}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("setNewPassword")}</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#096136]/10 ring-1 ring-[#096136]/20">
                <CheckCircle className="h-6 w-6 text-[#096136]" />
              </div>
              <div>
                <p className="font-medium">{t("passwordUpdatedRedirecting")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">{t("newPassword")}</label>
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-medium">{t("confirmNewPassword")}</label>
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
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive" role="alert">
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

          <p className="mt-5 text-center text-xs text-muted-foreground">
            <Link to="/login" className="font-medium text-[#096136] hover:text-[#0c7844]">
              {t("backToSignIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
