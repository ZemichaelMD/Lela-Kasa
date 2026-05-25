import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, Eye, EyeOff, Lock } from "lucide-react";
import { API_URL, tokenStore } from "@/lib/sdk";
import { LangToggle } from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

export default function CustomerLoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forced PIN change state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [changeToken, setChangeToken] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

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

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin !== confirmPin) {
      setChangeError("PINs do not match");
      return;
    }
    if (newPin.length < 4) {
      setChangeError("PIN must be at least 4 characters");
      return;
    }
    setChanging(true);
    setChangeError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/customer-portal/change-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${changeToken}`,
        },
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
      <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-brand-50 via-background to-background px-4 py-12 dark:from-brand-950/30">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LangToggle />
        </div>
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Lock className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold">Change Your PIN</h1>
            <p className="text-sm text-muted-foreground">
              For security, you must change your PIN before accessing the portal.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <form className="space-y-4" onSubmit={handleChangePin}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current PIN</label>
                <div className="relative">
                  <input
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    type={showCurrentPin ? "text" : "password"}
                    required
                    className={inputClass}
                    placeholder="••••••"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
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
                    className={inputClass}
                    placeholder="••••••"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
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
                  className={inputClass}
                  placeholder="••••••"
                  maxLength={10}
                />
              </div>
              {changeError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                  {changeError}
                </div>
              )}
              <button
                type="submit"
                disabled={changing}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
              >
                {changing ? "Changing PIN..." : "Change PIN & Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-brand-50 via-background to-background px-4 py-12 dark:from-brand-950/30">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LangToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Crown className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">{t("customerPortal")}</h1>
          <p className="text-sm text-muted-foreground">{t("signIn")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("username")}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={inputClass}
                placeholder={t("username")}
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
                  className={inputClass}
                  placeholder="••••••"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
            >
              {submitting ? t("signingIn") : t("signInBtn")}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-foreground hover:underline"
            >
              {t("ownerStaffLogin")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
