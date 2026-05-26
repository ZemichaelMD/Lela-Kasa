import { Check, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sdk } from "@/lib/sdk";
import type { Employee } from "@/sdk";
import { useI18n } from "@/lib/i18n";

function PasswordStrength({ password, t }: { password: string; t: (key: any) => string }) {
  const checks = [
    { key: 'pwMinChars', label: t('pwMinChars'), met: password.length >= 8 },
    { key: 'pwContainsLowercase', label: t('pwContainsLowercase'), met: /[a-z]/.test(password) },
    { key: 'pwContainsUppercase', label: t('pwContainsUppercase'), met: /[A-Z]/.test(password) },
    { key: 'pwContainsNumber', label: t('pwContainsNumber'), met: /[0-9]/.test(password) },
    { key: 'pwContainsSymbol', label: t('pwContainsSymbol'), met: /[^A-Za-z0-9]/.test(password) },
  ];
  const classesMet = checks.filter((c) => c.met).length - 1;
  const minClassesMet = classesMet >= 3;

  return (
    <ul className="space-y-1 pt-1">
      {checks.map((c) => (
        <li key={c.key} className="flex items-center gap-1.5 text-[11px]">
          {c.met ? (
            <Check className="h-3 w-3 shrink-0 text-success" />
          ) : (
            <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          )}
          <span className={c.met ? "text-success" : "text-muted-foreground"}>
            {c.label}
          </span>
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-[11px]">
        {minClassesMet ? (
          <Check className="h-3 w-3 shrink-0 text-success" />
        ) : (
          <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        )}
        <span
          className={minClassesMet ? "text-success" : "text-muted-foreground"}
        >
          {t('pwMinClasses')}
        </span>
      </li>
    </ul>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Employee | null;
  onSaved: (e: Employee) => void;
}

export function EmployeeDrawer({
  open,
  onClose,
  editing,
  onSaved,
}: DrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPw, setResetPw] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setEmail(editing?.email ?? "");
      setPhone(editing?.phone ?? "");
      setPassword("");
      setIsActive(editing?.isActive ?? true);
      setResetPwOpen(false);
      setResetPw("");
      setResetPwConfirm("");
    }
  }, [open, editing]);

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return t('pwErrorMinLength');
    if (pw.length > 128) return t('pwErrorMaxLength');
    const classes = [
      /[a-z]/.test(pw),
      /[A-Z]/.test(pw),
      /[0-9]/.test(pw),
      /[^A-Za-z0-9]/.test(pw),
    ].filter(Boolean).length;
    if (classes < 3) return t('pwErrorMinClasses');
    return null;
  }

  async function handleResetPassword() {
    if (!editing) return;
    if (!resetPw) {
      toast.error(t('pwErrorRequired'));
      return;
    }
    if (resetPw.length < 8) {
      toast.error(t('pwErrorMinLength'));
      return;
    }
    if (resetPw !== resetPwConfirm) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    const classes = [
      /[a-z]/.test(resetPw),
      /[A-Z]/.test(resetPw),
      /[0-9]/.test(resetPw),
      /[^A-Za-z0-9]/.test(resetPw),
    ].filter(Boolean).length;
    if (classes < 3) {
      toast.error(t('pwErrorMinClasses'));
      return;
    }

    setResettingPw(true);
    try {
      await sdk.employees.resetPassword(editing.id, resetPw);
      toast.success(t('pwResetSuccess'));
      setResetPwOpen(false);
      setResetPw("");
      setResetPwConfirm("");
    } catch (err: any) {
      toast.error(err?.message || t('pwResetFailed'));
    } finally {
      setResettingPw(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) {
      if (!email.trim() && !phone.trim()) {
        toast.error(t('contactRequired'));
        return;
      }
      if (!password) {
        toast.error(t('pwRequired'));
        return;
      }
      const pwError = validatePassword(password);
      if (pwError) {
        toast.error(pwError);
        return;
      }
    }
    setSaving(true);
    try {
      let saved: Employee;
      if (editing) {
        saved = await sdk.employees.update(editing.id, {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          isActive,
        });
        toast.success(t("employeeUpdated"));
      } else {
        saved = await sdk.employees.invite({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
        toast.success(t("employeeInvited"));
      }
      onSaved(saved);
    } catch (err: any) {
      toast.error(
        err?.message ||
          (editing ? t("failedUpdateEmployee") : t("failedInviteEmployee")),
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {editing ? t("editEmployee") : t("inviteEmployee")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("nameStar")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className={inputClass}
              placeholder={t("fullName") as string}
            />
          </div>
          {!editing && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("emailStar")}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className={inputClass}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("phoneStar")}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({t("smsNotificationSent")})
                  </span>
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className={inputClass}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("password")} *</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className={inputClass}
                  placeholder="••••••••"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                {(passwordFocused || password.length > 0) && (
                  <PasswordStrength password={password} t={t} />
                )}
              </div>
            </>
          )}
          {editing && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('email')}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className={inputClass}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('phone')}</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className={inputClass}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>
            </>
          )}
          {editing && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">{t("active")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("activeEmployeesDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isActive ? "left-4" : "left-0.5"}`}
                  />
                </button>
              </div>

              {/* Reset password */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setResetPwOpen(!resetPwOpen)}
                  className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{t('resetPassword')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('resetPasswordDesc')}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {resetPwOpen ? "▲" : "▼"}
                  </span>
                </button>
                {resetPwOpen && (
                  <div className="space-y-3 border-t border-border px-3.5 py-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        {t('newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          value={resetPw}
                          onChange={(e) => setResetPw(e.target.value)}
                          type={showResetPw ? "text" : "password"}
                          required
                          className={inputClass}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPw(!showResetPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showResetPw ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        {t('confirmPassword')}
                      </label>
                      <input
                        value={resetPwConfirm}
                        onChange={(e) => setResetPwConfirm(e.target.value)}
                        type="password"
                        required
                        className={inputClass}
                        placeholder="••••••••"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resettingPw}
                      className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {resettingPw ? t('resetting') : t('setNewPassword')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
            >
              {saving
                ? t("saving")
                : editing
                  ? t("saveChanges")
                  : t("sendInvite")}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

interface DeactivateProps {
  employee: Employee | null;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function DeactivateDialog({
  employee,
  onConfirm,
  onCancel,
  saving,
}: DeactivateProps) {
  const { t } = useI18n();
  if (!employee) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">
          {t("deactivateEmployeeQuestion")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>{employee.name}</strong> {t("deactivateEmployeeDesc")}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90"
          >
            {saving ? t("deactivating") : t("deactivate")}
          </button>
        </div>
      </div>
    </div>
  );
}
