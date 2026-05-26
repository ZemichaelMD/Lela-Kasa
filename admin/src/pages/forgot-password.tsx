import { AlertCircle, ArrowLeft, CheckCircle, Shield } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/data";
import { sdk } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { useI18n } from "@/lib/i18n";

const ic = "h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-[#096136]/60 focus:ring-2 focus:ring-[#096136]/20";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await sdk.auth.forgotPassword({ email: email.trim().toLowerCase() });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("couldNotSendEmail"));
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

      <div className="relative z-10 w-full max-w-[380px] space-y-5">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToSignIn")}
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-md">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <div className="absolute inset-0 scale-110 rounded-2xl bg-[#096136]/30 blur-2xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#096136] ring-1 ring-[#096136]/50">
                <Shield className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{APP_NAME} admin</h1>
              <p className="mt-0.5 text-sm text-white/40">{t("resetYourPassword")}</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#096136]/15 ring-1 ring-[#096136]/30">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">{t("checkEmailForReset")}</p>
                <p className="mt-1 text-xs text-white/40">Check your spam folder if you don't see it.</p>
              </div>
              <Link to="/login" className="mt-1 text-sm font-medium text-emerald-400 hover:text-emerald-300">
                {t("backToSignIn")}
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-white/60">{t("email")}</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kasa.app"
                  className={ic}
                />
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
                {submitting ? t("sending") : t("sendResetLink")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
