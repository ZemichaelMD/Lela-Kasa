import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { sdk, tokenStore } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/logo.png";

const ic = "h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm outline-none placeholder:text-muted-foreground/50 transition-all focus:border-[#096136]/50 focus:ring-2 focus:ring-[#096136]/20";
const primaryBtn = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#096136] to-[#0c7844] text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

type Mode = "password" | "otp";

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshMe } = useAuth();

  const [mode, setMode] = useState<Mode>("password");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirect = params.get("redirect");

  function normalizeRedirect(path: string): string {
    if (!path.startsWith("/")) return "/dashboard";
    if (path === "/") return "/dashboard";
    return path;
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!loginId.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      const isEmail = loginId.includes("@");
      if (isEmail) {
        const res = await sdk.auth.login({ email: loginId.trim().toLowerCase(), password });
        tokenStore.setTokens(res.accessToken, res.refreshToken);
        await refreshMe();
      } else {
        const res = await sdk.auth.loginWithPhone(loginId.trim(), password);
        tokenStore.setTokens(res.accessToken, res.refreshToken);
        await refreshMe();
      }
      navigate(redirect ? normalizeRedirect(redirect) : "/sales", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("signInFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendOtp() {
    if (!otpPhone.trim()) return;
    setSendingOtp(true);
    setError(null);
    try {
      await sdk.auth.requestOtp(otpPhone.trim(), "login");
      setOtpSent(true);
      toast.success("Verification code sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("failedSendOtp");
      setError(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!otpPhone.trim() || !otp.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await sdk.auth.loginWithOtp(otpPhone.trim(), otp.trim());
      tokenStore.setTokens(res.accessToken, res.refreshToken);
      await refreshMe();
      navigate(redirect ? normalizeRedirect(redirect) : "/sales", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("signInFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1d14] via-[#0f2419] to-[#07120d] px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-[#096136]/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-[#0d7840]/10 blur-[80px]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-2xl bg-[#096136]/25 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/20">
              <img src={logo} alt={APP_NAME} className="h-full w-full object-cover" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{APP_NAME}</h1>
            <p className="mt-0.5 text-sm text-white/50">{t("signIn")}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:border-white/[0.07] dark:bg-gray-950/95">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5">
            {(["password", "otp"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-white text-foreground shadow-sm dark:bg-gray-800"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "password" ? "Email / Phone" : "Phone + OTP"}
              </button>
            ))}
          </div>

          {mode === "password" ? (
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email or Phone</label>
                <input
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  required
                  autoComplete="username"
                  className={ic}
                  placeholder="you@example.com or +251 9XX XXX XXX"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t("password")}</label>
                  <Link to="/forgot-password" className="text-xs font-medium text-[#096136] transition-colors hover:text-[#0c7844] dark:text-emerald-400">
                    {t("forgotPassword")}
                  </Link>
                </div>
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? t("signingIn") : <>{t("signIn")} <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleOtpSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("phoneNumber")}</label>
                <input
                  value={otpPhone}
                  onChange={e => setOtpPhone(e.target.value)}
                  type="tel"
                  required
                  className={ic}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>
              {!otpSent ? (
                <button type="button" onClick={handleSendOtp} disabled={sendingOtp || !otpPhone.trim()} className={primaryBtn}>
                  {sendingOtp ? t("sending") : t("sendOtp")}
                </button>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("oneTimeCode")}</label>
                    <input value={otp} onChange={e => setOtp(e.target.value)} required className={ic} placeholder="• • • • • •" />
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <button type="submit" disabled={submitting} className={primaryBtn}>
                    {submitting ? t("signingIn") : <>{t("signIn")} <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); setError(null); }}
                    className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("changeNumber")}
                  </button>
                </>
              )}
            </form>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/40">or</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="mt-4">
            <Link
              to="/customer-login"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border/60 text-sm font-medium text-muted-foreground transition-all hover:border-[#096136]/40 hover:bg-[#096136]/5 hover:text-[#096136]"
            >
              Customer Portal Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/40">
          {t("noAccount")}{" "}
          <Link to="/register" className="font-medium text-white/70 transition-colors hover:text-white">
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
