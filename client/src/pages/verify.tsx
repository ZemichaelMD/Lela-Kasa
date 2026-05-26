import { Check, Loader, LogOut, Mail, Pencil, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth-context";
import { sdk, tokenStore } from "@/lib/sdk";

const ic =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

const RESEND_COOLDOWN = 60; // seconds

function useCooldown() {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setRemaining(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return { remaining, start };
}

type VerifySection = "phone" | "email" | "done";

export default function VerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, refreshMe } = useAuthContext();
  const phoneFromQuery = params.get("phone") || user?.phone || "";
  const emailFromUser = user?.email || "";

  const [section, setSection] = useState<VerifySection>("phone");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Email/phone display & edit state
  const [displayPhone, setDisplayPhone] = useState(phoneFromQuery);
  const [displayEmail, setDisplayEmail] = useState(emailFromUser);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [editEmailValue, setEditEmailValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [changeOtpPhone, setChangeOtpPhone] = useState("");
  const [changeOtpEmail, setChangeOtpEmail] = useState("");
  const [awaitingPhoneOtp, setAwaitingPhoneOtp] = useState(false);
  const [awaitingEmailOtp, setAwaitingEmailOtp] = useState(false);

  // Cooldowns
  const phoneCooldown = useCooldown();
  const emailCooldown = useCooldown();

  useEffect(() => {
    async function check() {
      try {
        const v = await sdk.auth.getVerificationStatus();
        if (v) {
          setPhoneVerified(v.phone?.verified ?? false);
          setEmailVerified(v.email?.verified ?? false);
          if (v.phone?.value) setDisplayPhone(v.phone.value);
          if (v.email?.value) setDisplayEmail(v.email.value);

          // Already have at least one channel verified · no need for the wall
          if (v.phone?.verified || v.email?.verified) {
            await refreshMe();
            navigate("/sales", { replace: true });
            return;
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingStatus(false);
      }
    }
    void check();
  }, [navigate, refreshMe]);

  const resendPhone = useCallback(async () => {
    if (!displayPhone) return;
    try {
      await sdk.auth.requestOtp(displayPhone, "phone_verification");
      toast.success("Phone verification code sent");
      phoneCooldown.start();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    }
  }, [displayPhone, phoneCooldown]);

  const resendEmail = useCallback(async () => {
    if (!displayEmail) return;
    try {
      await sdk.auth.sendEmailOtp();
      toast.success("Email verification code sent");
      emailCooldown.start();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    }
  }, [displayEmail, emailCooldown]);

  async function verifyPhone() {
    if (!phoneCode.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await sdk.auth.verifyPhone(displayPhone, phoneCode.trim());
      setPhoneVerified(true);
      toast.success("Phone verified");
      await refreshMe();
      setSection(displayEmail ? "email" : "done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEmail() {
    if (!emailCode.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await sdk.auth.verifyEmailOtp(emailCode.trim());
      setEmailVerified(true);
      toast.success("Email verified");
      await refreshMe();
      setSection("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Change phone ─────────────────────────────────────────────────────────

  async function startPhoneChange() {
    if (!editPhoneValue.trim()) { toast.error("Enter a phone number"); return; }
    setSavingPhone(true);
    try {
      await sdk.auth.requestPhoneChange(editPhoneValue.trim());
      setAwaitingPhoneOtp(true);
      toast.success("OTP sent to new phone number");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
    } finally {
      setSavingPhone(false);
    }
  }

  async function confirmPhoneChange() {
    if (!changeOtpPhone.trim()) { toast.error("Enter the OTP code"); return; }
    setSavingPhone(true);
    try {
      const res = await sdk.auth.confirmPhoneChange(editPhoneValue.trim(), changeOtpPhone.trim());
      setDisplayPhone(res.phone);
      setEditingPhone(false);
      setAwaitingPhoneOtp(false);
      setEditPhoneValue("");
      setChangeOtpPhone("");
      toast.success("Phone number updated");
      void refreshMe();
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm phone change");
    } finally {
      setSavingPhone(false);
    }
  }

  function cancelPhoneEdit() {
    setEditingPhone(false);
    setAwaitingPhoneOtp(false);
    setEditPhoneValue("");
    setChangeOtpPhone("");
  }

  // ── Change email ─────────────────────────────────────────────────────────

  async function startEmailChange() {
    if (!editEmailValue.trim()) { toast.error("Enter an email address"); return; }
    if (!editEmailValue.includes("@")) { toast.error("Enter a valid email"); return; }
    setSavingEmail(true);
    try {
      await sdk.auth.requestEmailChange(editEmailValue.trim());
      setAwaitingEmailOtp(true);
      toast.success("OTP sent to new email address");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
    } finally {
      setSavingEmail(false);
    }
  }

  async function confirmEmailChange() {
    if (!changeOtpEmail.trim()) { toast.error("Enter the OTP code"); return; }
    setSavingEmail(true);
    try {
      const res = await sdk.auth.confirmEmailChange(editEmailValue.trim(), changeOtpEmail.trim());
      setDisplayEmail(res.email);
      setEditingEmail(false);
      setAwaitingEmailOtp(false);
      setEditEmailValue("");
      setChangeOtpEmail("");
      toast.success("Email updated. Please verify it.");
      void refreshMe();
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm email change");
    } finally {
      setSavingEmail(false);
    }
  }

  function cancelEmailEdit() {
    setEditingEmail(false);
    setAwaitingEmailOtp(false);
    setEditEmailValue("");
    setChangeOtpEmail("");
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  function handleLogout() {
    sdk.auth.logout().catch(() => {});
    tokenStore.clearTokens();
    navigate("/login", { replace: true });
  }

  // ── Done ─────────────────────────────────────────────────────────────────

  function handleDone() {
    void refreshMe();
    navigate("/sales", { replace: true });
  }

  if (loadingStatus) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (section === "done") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <Check className="mb-4 h-12 w-12 text-success" />
        <h1 className="text-xl font-bold">All Verified!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your phone and email are verified.
        </p>
        <button
          onClick={handleDone}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Account info card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Your Account</h2>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>

          {/* Email line */}
          {!editingEmail ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{displayEmail}</span>
                {emailVerified && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
              </div>
              <button type="button" onClick={() => { setEditEmailValue(displayEmail); setEditingEmail(true); }} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input value={editEmailValue} onChange={e => setEditEmailValue(e.target.value)} type="email" className={ic} placeholder="new@email.com" />
                <button type="button" onClick={cancelEmailEdit} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
              {!awaitingEmailOtp ? (
                <button type="button" onClick={startEmailChange} disabled={savingEmail} className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {savingEmail ? "Sending OTP..." : "Send OTP to new email"}
                </button>
              ) : (
                <div className="space-y-2">
                  <input value={changeOtpEmail} onChange={e => setChangeOtpEmail(e.target.value)} className={ic} placeholder="OTP from new email" inputMode="numeric" />
                  <button type="button" onClick={confirmEmailChange} disabled={savingEmail} className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    {savingEmail ? "Confirming..." : "Confirm OTP"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Phone line */}
          {!editingPhone ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{displayPhone}</span>
                {phoneVerified && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
              </div>
              <button type="button" onClick={() => { setEditPhoneValue(displayPhone); setEditingPhone(true); }} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input value={editPhoneValue} onChange={e => setEditPhoneValue(e.target.value)} type="tel" className={ic} placeholder="+251 9XX XXX XXX" />
                <button type="button" onClick={cancelPhoneEdit} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
              {!awaitingPhoneOtp ? (
                <button type="button" onClick={startPhoneChange} disabled={savingPhone} className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {savingPhone ? "Sending OTP..." : "Send OTP to new phone"}
                </button>
              ) : (
                <div className="space-y-2">
                  <input value={changeOtpPhone} onChange={e => setChangeOtpPhone(e.target.value)} className={ic} placeholder="OTP from new phone" inputMode="numeric" />
                  <button type="button" onClick={confirmPhoneChange} disabled={savingPhone} className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    {savingPhone ? "Confirming..." : "Confirm OTP"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification section */}
        {section === "phone" && !phoneVerified && (
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center mb-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Smartphone className="h-7 w-7 text-primary" />
              </span>
              <div>
                <h1 className="text-xl font-bold">Verify Your Phone</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the code sent to <strong>{displayPhone}</strong>
                </p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void verifyPhone(); }}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Verification Code</label>
                <input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} required className={ic} placeholder="• • • • • •" inputMode="numeric" autoFocus />
              </div>
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
              )}
              <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                {submitting ? "Verifying..." : "Verify Phone"}
              </button>
              <button type="button" onClick={resendPhone} disabled={phoneCooldown.remaining > 0} className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                {phoneCooldown.remaining > 0
                  ? `Resend in ${phoneCooldown.remaining}s`
                  : "Didn't get a code? Resend"}
              </button>
              {displayEmail && (
                <button type="button" onClick={() => setSection("email")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                  Skip · verify email instead
                </button>
              )}
            </form>
          </div>
        )}

        {section === "email" && !emailVerified && (
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center mb-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </span>
              <div>
                <h1 className="text-xl font-bold">Verify Your Email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the code sent to <strong>{displayEmail}</strong>
                </p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void verifyEmail(); }}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Verification Code</label>
                <input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} required className={ic} placeholder="• • • • • •" inputMode="numeric" autoFocus />
              </div>
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
              )}
              <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60">
                {submitting ? "Verifying..." : "Verify Email"}
              </button>
              <button type="button" onClick={resendEmail} disabled={emailCooldown.remaining > 0} className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
                {emailCooldown.remaining > 0
                  ? `Resend in ${emailCooldown.remaining}s`
                  : "Didn't get a code? Resend"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
