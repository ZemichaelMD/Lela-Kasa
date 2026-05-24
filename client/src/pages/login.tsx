import { ArrowRight, Eye, EyeOff, Building2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { sdk, tokenStore } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";

const ic = "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

type Mode = "password" | "otp";

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, refreshMe } = useAuth();

  const [mode, setMode] = useState<Mode>("password");

  // Password mode
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode
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
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-50 via-background to-background px-4 py-12 dark:from-brand-950/30">
      <div className="absolute right-4 top-4 flex items-center gap-2"><LangToggle /><ThemeToggle /></div>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-6 w-6" /></span>
          <h1 className="text-xl font-semibold">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">{t("signIn")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
          {/* Mode tabs */}
          <div className="mb-5 flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(["password", "otp"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "password" ? "Email / Phone" : "Phone + OTP"}
              </button>
            ))}
          </div>

          {mode === "password" ? (
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email or Phone</label>
                <input value={loginId} onChange={e => setLoginId(e.target.value)} required autoComplete="username" className={ic} placeholder="you@example.com / +251 9XX XXX XXX" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t("password")}</label>
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">{t("forgotPassword")}</Link>
                </div>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required autoComplete="current-password" className={ic} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
              <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                {submitting ? t("signingIn") : (<>{t("signIn")} <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleOtpSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("phoneNumber")}</label>
                <input value={otpPhone} onChange={e => setOtpPhone(e.target.value)} type="tel" required className={ic} placeholder="+251 9XX XXX XXX" />
              </div>
              {!otpSent ? (
                <button type="button" onClick={handleSendOtp} disabled={sendingOtp || !otpPhone.trim()} className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                  {sendingOtp ? t("sending") : t("sendOtp")}
                </button>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("oneTimeCode")}</label>
                    <input value={otp} onChange={e => setOtp(e.target.value)} required className={ic} placeholder="• • • • • •" />
                  </div>
                  {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
                  <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                    {submitting ? t("signingIn") : (<>{t("signIn")} <ArrowRight className="h-4 w-4" /></>)}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setError(null); }} className="text-xs text-muted-foreground hover:text-foreground">{t("changeNumber")}</button>
                </>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary hover:text-primary/90">{t("register")}</Link>
        </p>

        <div className="text-center">
          <Link to="/customer-login" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700">
            <span className="text-xs">👤</span> Customer Portal Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
