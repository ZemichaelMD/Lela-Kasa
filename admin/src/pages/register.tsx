import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader, Shield, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { APP_NAME } from "@/lib/data";
import { sdk, tokenStore } from "@/lib/sdk";
import { ThemeToggle } from "@/components/theme";
import { useI18n } from "@/lib/i18n";

const ic = "h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-[#096136]/60 focus:ring-2 focus:ring-[#096136]/20";
const primaryBtn = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#096136] to-[#0c7844] text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min. 8 characters", met: password.length >= 8 },
    { label: "Contains lowercase", met: /[a-z]/.test(password) },
    { label: "Contains uppercase", met: /[A-Z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
    { label: "Contains symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const classesMet = checks.filter((c) => c.met).length - 1;
  const minClassesMet = classesMet >= 3;

  return (
    <ul className="mt-2 space-y-1 rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-2 text-[11px]">
          {c.met ? <Check className="h-3 w-3 shrink-0 text-emerald-400" /> : <X className="h-3 w-3 shrink-0 text-white/20" />}
          <span className={c.met ? "text-emerald-400" : "text-white/40"}>{c.label}</span>
        </li>
      ))}
      <li className="flex items-center gap-2 text-[11px]">
        {minClassesMet ? <Check className="h-3 w-3 shrink-0 text-emerald-400" /> : <X className="h-3 w-3 shrink-0 text-white/20" />}
        <span className={minClassesMet ? "text-emerald-400" : "text-white/40"}>At least 3 of: lowercase, uppercase, numbers, symbols</span>
      </li>
    </ul>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<{ registrationOpen: boolean; passwordMinLength: number; appName: string } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    sdk.auth.getPublicConfig()
      .then(setConfig)
      .catch(() => setError("Could not load registration settings"))
      .finally(() => setLoadingConfig(false));
  }, []);

  if (loadingConfig) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#0e1916] via-[#111f1b] to-[#090e0c]">
        <Loader className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (config && !config.registrationOpen) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#0e1916] via-[#111f1b] to-[#090e0c] px-4">
        <div className="max-w-sm space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-md">
          <h1 className="text-xl font-semibold text-white">{config.appName}</h1>
          <p className="text-sm text-white/50">Registration is currently closed. Please contact the administrator to create an account.</p>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300">Go to Login</Link>
        </div>
      </div>
    );
  }

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (pw.length > 128) return "Password must be at most 128 characters";
    const classes = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
    if (classes < 3) return "Use at least 3 of: lowercase, uppercase, numbers, symbols";
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Email is required"); return; }
    if (!phone.trim()) { setError("Phone number is required"); return; }
    if (password !== confirmPassword) { setError(t("passwordsDoNotMatch")); return; }
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }

    setSubmitting(true);
    try {
      const res = await sdk.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        shopName: shopName.trim(),
        phone: phone.trim(),
      });
      tokenStore.setTokens(res.accessToken, res.refreshToken);
      navigate(`/verify?phone=${encodeURIComponent(phone.trim())}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registrationFailed"));
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

      <div className="relative z-10 w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-2xl bg-[#096136]/30 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#096136] ring-1 ring-[#096136]/50">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{APP_NAME}</h1>
            <p className="mt-0.5 text-sm text-white/40">{t("createOwnerAccount")}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-white/60">{t("fullName")}</label>
              <input id="name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Selam Tadesse" className={ic} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-white/60">{t("email")}</label>
                <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={ic} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-white/60">{t("phoneNumber")} *</label>
                <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 9XX XXX XXX" className={ic} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="shopName" className="text-sm font-medium text-white/60">{t("shopName")}</label>
              <input id="shopName" type="text" required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="My Beverage Shop" className={ic} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-white/60">{t("password")}</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  className={ic + " pr-11"}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/50" tabIndex={-1}
                  aria-label={showPassword ? (t("hidePassword") as string) : (t("showPassword") as string)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(passwordFocused || password.length > 0) && <PasswordStrength password={password} />}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-white/60">{t("confirmPassword")}</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={ic + " pr-11"}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/50" tabIndex={-1}
                  aria-label={showConfirm ? (t("hidePassword") as string) : (t("showPassword") as string)}>
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

            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? t("creatingAccount") : <>{t("createAccount")} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-white/30">
            {t("alreadyHaveAccount")}{" "}
            <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">{t("signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
