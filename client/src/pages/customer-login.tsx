import { AlertCircle, Crown, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL, tokenStore } from "@/lib/sdk";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";

const ic = "h-12 w-full rounded-xl border border-border/60 bg-background px-4 text-sm outline-none placeholder:text-muted-foreground/50 transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20";
const amberBtn = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export default function CustomerLoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [changeToken, setChangeToken] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Forgot PIN state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'code'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/customer-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), pin: pin.trim() }),
      });
      const envelope = await res.json();
      const data = envelope?.data ?? envelope;
      if (!res.ok) throw new Error(data?.message || t("invalidCredentials"));

      if (data.customer?.mustChangePassword) {
        setMustChangePassword(true);
        setChangeToken(data.accessToken);
        return;
      }

      tokenStore.setTokens(data.accessToken, "");
      navigate(`/customer-portal/${data.customer.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || t("invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotSendCode() {
    if (!forgotEmail.trim()) return;
    setForgotBusy(true);
    setForgotError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/customer-forgot-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const envelope = await res.json();
      if (!res.ok) throw new Error((envelope?.error?.message || envelope?.message) ?? "Failed to send code");
      setForgotStep('code');
    } catch (err: any) {
      setForgotError(err.message || "Failed to send code");
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleForgotReset() {
    if (forgotNewPin !== forgotConfirmPin) { setForgotError("PINs do not match"); return; }
    if (forgotNewPin.length < 4) { setForgotError("PIN must be at least 4 characters"); return; }
    setForgotBusy(true);
    setForgotError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/customer-reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), code: forgotCode.trim(), newPin: forgotNewPin.trim() }),
      });
      const envelope = await res.json();
      if (!res.ok) throw new Error((envelope?.error?.message || envelope?.message) ?? "Failed to reset PIN");
      setShowForgot(false);
      setForgotStep('email');
      setForgotEmail('');
      setForgotCode('');
      setForgotNewPin('');
      setForgotConfirmPin('');
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset PIN");
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin !== confirmPin) { setChangeError("PINs do not match"); return; }
    if (newPin.length < 4) { setChangeError("PIN must be at least 4 characters"); return; }
    setChanging(true);
    setChangeError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/customer-portal/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${changeToken}` },
        body: JSON.stringify({ currentPin: currentPin.trim(), newPin: newPin.trim() }),
      });
      const envelope = await res.json();
      const data = envelope?.data ?? envelope;
      if (!res.ok) throw new Error(data?.message || "Failed to change PIN");

      tokenStore.setTokens(data.accessToken, "");
      navigate(`/customer-portal/${data.customer.id}`, { replace: true });
    } catch (err: any) {
      setChangeError(err.message || "Failed to change PIN");
    } finally {
      setChanging(false);
    }
  }

  if (mustChangePassword) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1208] via-[#170f05] to-[#0f0a04] px-4 py-12">
        <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-amber-600/10 blur-[80px]" />

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <LangToggle />
        </div>

        <div className="relative z-10 w-full max-w-[380px] space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 shadow-lg ring-1 ring-amber-400/30">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Change Your PIN</h1>
              <p className="mt-0.5 text-sm text-white/50">Set a new PIN to continue</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:border-white/[0.07] dark:bg-gray-950/95">
            <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              For your security, please change your PIN before accessing the portal.
            </p>
            <form className="space-y-4" onSubmit={handleChangePin}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current PIN</label>
                <div className="relative">
                  <input
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    type={showCurrentPin ? "text" : "password"}
                    required
                    className={ic}
                    placeholder="••••••"
                    maxLength={10}
                  />
                  <button type="button" onClick={() => setShowCurrentPin(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground" tabIndex={-1}>
                    {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New PIN</label>
                <div className="relative">
                  <input
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    type={showNewPin ? "text" : "password"}
                    required
                    className={ic}
                    placeholder="••••••"
                    maxLength={10}
                  />
                  <button type="button" onClick={() => setShowNewPin(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground" tabIndex={-1}>
                    {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm New PIN</label>
                <input
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  type="password"
                  required
                  className={ic}
                  placeholder="••••••"
                  maxLength={10}
                />
              </div>
              {changeError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}
              <button type="submit" disabled={changing} className={amberBtn}>
                {changing ? "Changing PIN…" : "Change PIN & Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1208] via-[#170f05] to-[#0f0a04] px-4 py-12">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-[350px] w-[350px] rounded-full bg-amber-600/10 blur-[80px]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-2xl bg-amber-500/25 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500 ring-1 ring-amber-400/30">
              <Crown className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t("customerPortal")}</h1>
            <p className="mt-0.5 text-sm text-white/50">{t("signIn")}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:border-white/[0.07] dark:bg-gray-950/95">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("username")}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={ic}
                placeholder={t("username") as string}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("pin")}</label>
              <div className="relative">
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  type={showPin ? "text" : "password"}
                  required
                  autoComplete="off"
                  className={ic + " pr-11"}
                  placeholder="••••••"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={submitting} className={amberBtn}>
              {submitting ? t("signingIn") : t("signInBtn")}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-amber-600 hover:text-amber-500 hover:underline">
                Forgot PIN?
              </button>
            </div>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/40">or</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="mt-4">
            <Link
              to="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border/60 text-sm font-medium text-muted-foreground transition-all hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-600"
            >
              {t("ownerStaffLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  {/* Forgot PIN modal */}
  if (showForgot) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Reset PIN</h3>
            <button type="button" onClick={() => { setShowForgot(false); setForgotStep('email'); setForgotError(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {forgotStep === 'email' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter your email to receive a PIN reset code.</p>
              <input
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className={ic}
                placeholder="your@email.com"
                type="email"
                autoFocus
              />
              {forgotError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}
              <button type="button" onClick={handleForgotSendCode} disabled={forgotBusy} className={amberBtn}>
                {forgotBusy ? "Sending..." : "Send Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter the code sent to {forgotEmail} and set a new PIN.</p>
              <input
                value={forgotCode}
                onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={ic}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
              <input
                value={forgotNewPin}
                onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={ic}
                placeholder="New PIN"
                type="password"
                maxLength={10}
              />
              <input
                value={forgotConfirmPin}
                onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={ic}
                placeholder="Confirm PIN"
                type="password"
                maxLength={10}
              />
              {forgotError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}
              <button type="button" onClick={handleForgotReset} disabled={forgotBusy} className={amberBtn}>
                {forgotBusy ? "Resetting..." : "Reset PIN"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
