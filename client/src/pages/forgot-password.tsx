import { AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/data";
import { sdk } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/logo.png";

const ic = "h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm outline-none placeholder:text-muted-foreground/50 transition-all focus:border-[#096136]/50 focus:ring-2 focus:ring-[#096136]/20";

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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1d14] via-[#0f2419] to-[#07120d] px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-[#096136]/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-[#0d7840]/10 blur-[80px]" />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-5">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToSignIn")}
        </Link>

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
              <p className="mt-0.5 text-sm text-muted-foreground">{t("resetYourPassword")}</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#096136]/10 ring-1 ring-[#096136]/20">
                <CheckCircle className="h-6 w-6 text-[#096136]" />
              </div>
              <div>
                <p className="font-medium">{t("checkEmailForReset")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Check your spam folder if you don't see it.</p>
              </div>
              <Link to="/login" className="mt-1 text-sm font-medium text-[#096136] hover:text-[#0c7844]">
                {t("backToSignIn")}
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">{t("email")}</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={ic}
                />
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
                {submitting ? t("sending") : t("sendResetLink")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
