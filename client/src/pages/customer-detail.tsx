import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Bell,
  Box,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  Key,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Wine,
  XCircle,
  ShoppingCart,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PermissionGate } from "@/components/permission-gate";
import { StatusChip } from "@/components/data-table";
import { sdk } from "@/lib/sdk";
import type {
  Beverage,
  Customer,
  LedgerEntry,
  LedgerPaymentEntry,
  LedgerReturnEntry,
  LedgerSaleEntry,
  PaymentAccount,
  PriceTier,
} from "@/sdk";
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

type TabId = "activity" | "sales" | "payments" | "returns";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function getFirstOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

// ─── Widget card ──────────────────────────────────────────────────────────────

interface WidgetProps {
  icon: typeof Coins;
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
  hint?: string;
  onClick?: () => void;
  actionLabel?: string;
}

function Widget({
  icon: Icon,
  label,
  value,
  tone = "default",
  hint,
  onClick,
  actionLabel,
}: WidgetProps) {
  const valueClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-amber-600"
          : "text-foreground";
  const interactive = !!onClick;
  return (
    <Card
      className={`p-4 ${
        interactive
          ? "cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30 active:bg-accent/50"
          : ""
      }`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={`mt-1.5 text-2xl font-semibold tabular-nums ${valueClass}`}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-lg bg-muted p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          {actionLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {actionLabel}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function SmsModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<"balance" | "custom">("balance");

  const balanceReminderText = `Hi ${customer.name}, your current balance is ${formatMoneyCents(customer.creditBalanceCents)}. Please clear your outstanding balance at your earliest convenience. Thank you!`;
  const displayMessage = template === "balance" ? balanceReminderText : message;

  async function handleSend() {
    if (!displayMessage.trim()) {
      toast.error(t("pleaseEnterMessage"));
      return;
    }
    setSending(true);
    try {
      await sdk.customers.sendSms(customer.id, { text: displayMessage });
      toast.success(t("smsSent"));
      onClose();
    } catch {
      toast.error(t("failedSendSms"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">{t("sendSms")}</h3>

        {/* Template Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("template")}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTemplate("balance")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                template === "balance"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-accent"
              }`}
            >
              {t("balanceReminder")}
            </button>
            <button
              type="button"
              onClick={() => setTemplate("custom")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                template === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-accent"
              }`}
            >
              {t("custom")}
            </button>
          </div>
        </div>

        {/* Message Input */}
        {template === "custom" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("message")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("enterYourMessage") as string}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            />
          </div>
        )}

        {/* Message Preview */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("preview")}</label>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p className="text-foreground">{displayMessage}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {displayMessage.length} {t("characters")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? t("sendingSms") : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  customer,
  accounts,
  onClose,
  onSaved,
}: {
  customer: Customer;
  accounts: PaymentAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || !accountId) return;
    setSaving(true);
    try {
      await sdk.customers.recordPayment(customer.id, {
        amountCents: cents,
        paymentAccountId: accountId,
        notes: notes.trim() || undefined,
      });
      toast.success(t("paymentRecorded"));
      onSaved();
    } catch {
      toast.error(t("failedRecordPayment"));
    } finally {
      setSaving(false);
    }
  }

  const ic =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4"
      >
        <h3 className="text-base font-semibold">
          {t("recordPayment")} · {customer.name}
        </h3>

        {customer.creditBalanceCents > 0 && (
          <div className="rounded-lg bg-destructive/10 px-3.5 py-3">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">
              {t("creditBalance")}
            </p>
            <p className="text-lg font-bold tabular-nums text-destructive">
              {formatMoneyCents(customer.creditBalanceCents)}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("amountPaid")}</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            required
            autoFocus
            className={ic}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("paymentAccounts")}</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            className={ic}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.kind})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("note")}</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={ic}
            placeholder={t("optionalNotes") as string}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReturnModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [boxes, setBoxes] = useState("");
  const [bottles, setBottles] = useState("");
  const [beverageId, setBeverageId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [beverages, setBeverages] = useState<Beverage[]>([]);

  useEffect(() => {
    sdk.beverages
      .list({ pageSize: 200 })
      .then((r) => setBeverages(r.data))
      .catch(() => {});
  }, []);

  const boxesCount = parseInt(boxes, 10) || 0;
  const bottlesCount = parseInt(bottles, 10) || 0;
  const boxesError = boxesCount > customer.outstandingBoxes;
  const bottlesError = bottlesCount > customer.outstandingBottles;
  const hasError = boxesError || bottlesError;
  const isEmpty = boxesCount <= 0 && bottlesCount <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty || hasError) return;
    setSaving(true);
    try {
      await sdk.customers.recordReturn(customer.id, {
        boxes: boxesCount,
        bottles: bottlesCount,
        beverageId: beverageId || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(t("returnRecorded"));
      onSaved();
    } catch {
      toast.error(t("failedRecordReturn"));
    } finally {
      setSaving(false);
    }
  }

  const ic =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const icError =
    "h-10 w-full rounded-lg border border-destructive bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-destructive/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4"
      >
        <h3 className="text-base font-semibold">
          {t("recordReturn")} · {customer.name}
        </h3>

        {(customer.outstandingBoxes > 0 || customer.outstandingBottles > 0) && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3 space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              {t("pendingBoxes")} / {t("pendingBottles")}
            </p>
            <div className="flex gap-4 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {customer.outstandingBoxes > 0 && (
                <span>
                  {customer.outstandingBoxes} {t("fullBoxes")}
                </span>
              )}
              {customer.outstandingBottles > 0 && (
                <span>
                  {customer.outstandingBottles} {t("extraBottles")}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("fullBoxes")}</label>
            <input
              value={boxes}
              onChange={(e) => setBoxes(e.target.value)}
              type="number"
              min="0"
              max={customer.outstandingBoxes}
              className={boxesError ? icError : ic}
              placeholder="0"
            />
            {boxesError && (
              <p className="text-xs text-destructive">
                {t("returnExceedsBoxes")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("extraBottles")}</label>
            <input
              value={bottles}
              onChange={(e) => setBottles(e.target.value)}
              type="number"
              min="0"
              max={customer.outstandingBottles}
              className={bottlesError ? icError : ic}
              placeholder="0"
            />
            {bottlesError && (
              <p className="text-xs text-destructive">
                {t("returnExceedsBottles")}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("note")}</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={ic}
            placeholder={t("optionalNotes") as string}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || isEmpty || hasError}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditCustomerDrawer({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onSaved: (updated: Customer) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState((customer as any).email ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [username, setUsername] = useState((customer as any).username ?? "");
  const [portalPin, setPortalPin] = useState("");
  const [tierId, setTierId] = useState(customer.priceTierId ?? "");
  const [tierLocked, setTierLocked] = useState(
    customer.priceTierLocked ?? false,
  );
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [saving, setSaving] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerifyCode, setEmailVerifyCode] = useState("");
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [resettingPin, setResettingPin] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const pinReadOnly = (customer as any).passwordChangedAt != null;
  const emailVerified = (customer as any).emailVerified;

  useEffect(() => {
    if (open) {
      setName(customer.name);
      setPhone(customer.phone ?? "");
      setEmail((customer as any).email ?? "");
      setNotes(customer.notes ?? "");
      setUsername((customer as any).username ?? "");
      setPortalPin("");
      setTierId(customer.priceTierId ?? "");
      setTierLocked(customer.priceTierLocked ?? false);
      setShowEmailVerify(false);
      setNewPin(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, customer]);

  useEffect(() => {
    sdk.priceTiers
      .list()
      .then(setTiers)
      .catch(() => {});
  }, []);

  async function handleSendEmailOtp() {
    setEmailVerifying(true);
    try {
      await sdk.customers.sendEmailOtp(customer.id);
      setShowEmailVerify(true);
      setEmailVerifyCode("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send code");
    } finally {
      setEmailVerifying(false);
    }
  }

  async function handleVerifyEmail() {
    if (!emailVerifyCode.trim()) return;
    setEmailVerifying(true);
    try {
      await sdk.customers.verifyEmail(customer.id, emailVerifyCode.trim());
      toast.success("Email verified");
      setShowEmailVerify(false);
      onSaved(await sdk.customers.findOne(customer.id));
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
    } finally {
      setEmailVerifying(false);
    }
  }

  async function handleResetPin() {
    setResettingPin(true);
    try {
      const result = await sdk.customers.ownerResetPin(customer.id);
      setNewPin(result.pin);
      toast.success("PIN reset successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset PIN");
    } finally {
      setResettingPin(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const dto: any = {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        priceTierId: tierId || undefined,
        priceTierLocked: tierLocked,
      };

      if (username.trim()) dto.username = username.trim();

      const updated = await sdk.customers.update(customer.id, dto);

      if (portalPin.trim() && !pinReadOnly) {
        await sdk.customers.setCredentials(customer.id, {
          username:
            username.trim() || name.trim().toLowerCase().replace(/\s+/g, "_"),
          pin: portalPin.trim(),
        });
        toast.success(t("customerUpdated") + " & portal PIN set");
      } else {
        toast.success(t("customerUpdated"));
      }
      onSaved(updated);
    } catch (err: any) {
      toast.error(err?.message || t("failedSaveCustomer"));
    } finally {
      setSaving(false);
    }
  }

  const ic =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("editCustomer")}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{t("editCustomer")}</h2>
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
            <label className="text-sm font-medium">
              {t("nameWithAsterisk")}
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={ic}
              placeholder={t("fullName") as string}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("phone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className={ic}
              placeholder={t("phonePlaceholder") as string}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className={ic}
              placeholder="customer@example.com"
            />
            {(customer as any).email && (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs ${emailVerified ? "text-success" : "text-amber-500"}`}
                >
                  {emailVerified ? "✓ Verified" : "Not verified"}
                </span>
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={emailVerifying}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {emailVerifying ? "Sending..." : "Verify"}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("note")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
              placeholder={t("optionalNotes") as string}
            />
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("priceTier")}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t("defaultPriceTier")}
              </label>
              <select
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className={ic}
              >
                <option value="">· {t("none")} ·</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} ({tier.kind.toLowerCase()})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("autoFilledOnNewSale")}
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tierLocked}
                onChange={(e) => setTierLocked(e.target.checked)}
                className="rounded border-border h-4 w-4"
              />
              <span className="text-sm">{t("lockPriceTier")}</span>
            </label>
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("customerPortalAccess")}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("username")}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={ic}
                placeholder="Auto-generated from name if empty"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("portalPin")}</label>
              <input
                value={portalPin}
                onChange={(e) => setPortalPin(e.target.value)}
                type="password"
                maxLength={10}
                disabled={pinReadOnly}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={
                  pinReadOnly
                    ? "Customer has changed their PIN"
                    : "Set a numeric PIN for customer login"
                }
              />
              {pinReadOnly && (
                <p className="text-xs text-muted-foreground">
                  {t("pinReadOnlyHint")}
                </p>
              )}
              {(customer as any).username && (
                <button
                  type="button"
                  onClick={handleResetPin}
                  disabled={resettingPin}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {resettingPin ? "Resetting..." : "Reset PIN"}
                </button>
              )}
              {newPin && (
                <div className="rounded-lg bg-success/10 border border-success/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-success">
                    New PIN generated
                  </p>
                  <p className="text-lg font-bold tabular-nums text-success">
                    {newPin}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tell the customer this PIN. They will be required to change
                    it on next login.
                  </p>
                </div>
              )}
            </div>
          </div>

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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </form>
      </aside>

      {showEmailVerify && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-semibold">Verify Email</h4>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to {email || (customer as any).email}
            </p>
            <input
              value={emailVerifyCode}
              onChange={(e) =>
                setEmailVerifyCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailVerify(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyEmail}
                disabled={emailVerifying}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {emailVerifying ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Payment Detail Modal ─────────────────────────────────────────────────────

function PaymentDetailModal({
  payment,
  accounts,
  onClose,
  onVoided,
}: {
  payment: LedgerPaymentEntry;
  accounts: PaymentAccount[];
  onClose: () => void;
  onVoided: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [voiding, setVoiding] = useState(false);
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const isVoided = !!payment.data.voidedAt;
  const canVoid = !isVoided && !!payment.data.saleId;
  const account = accounts.find((a) => a.id === payment.data.paymentAccountId);

  async function handleVoid() {
    if (!payment.data.saleId) return;
    setVoiding(true);
    try {
      await sdk.sales.voidPayment(
        payment.data.saleId,
        payment.data.id,
        voidReason.trim() || undefined,
      );
      toast.success(t("paymentVoided"));
      onVoided();
    } catch {
      toast.error(t("failedVoidPayment"));
    } finally {
      setVoiding(false);
    }
  }

  const ic =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("paymentDetails")}</h3>
          {isVoided && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <XCircle className="h-3 w-3" />
              {t("voided")}
            </span>
          )}
        </div>

        <div className="rounded-lg border border-border divide-y divide-border">
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("amount")}</span>
            <span
              className={`text-sm font-semibold tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-success"}`}
            >
              {formatMoneyCents(payment.data.amountCents)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("method")}</span>
            <span className="text-sm font-medium">
              {payment.data.method.replace(/_/g, " ")}
            </span>
          </div>
          {account && (
            <div className="flex justify-between px-3 py-2.5">
              <span className="text-sm text-muted-foreground">
                {t("paymentAccounts")}
              </span>
              <span className="text-sm font-medium">{account.name}</span>
            </div>
          )}
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("date")}</span>
            <span className="text-sm">
              {new Date(payment.data.paidAt).toLocaleString()}
            </span>
          </div>
          {payment.data.reference && (
            <div className="flex justify-between px-3 py-2.5">
              <span className="text-sm text-muted-foreground">
                {t("reference")}
              </span>
              <span className="text-sm">{payment.data.reference}</span>
            </div>
          )}
          {payment.data.notes && (
            <div className="flex justify-between px-3 py-2.5">
              <span className="text-sm text-muted-foreground">{t("note")}</span>
              <span className="text-sm">{payment.data.notes}</span>
            </div>
          )}
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
              {payment.data.saleId ? t("salePayment") : t("accountPayment")}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {payment.data.saleId && (
            <button
              type="button"
              onClick={() => {
                navigate(`/sales/${payment.data.saleId!}`);
              }}
              className="w-full rounded-lg border border-success px-4 py-2.5 text-sm font-medium text-success hover:bg-success/10 transition-colors  inline-flex items-center justify-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {t("viewSale")}
            </button>
          )}
          {canVoid && !showVoidForm && (
            <button
              type="button"
              onClick={() => setShowVoidForm(true)}
              className="w-full rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              {t("voidPayment")}
            </button>
          )}
        </div>

        {canVoid && showVoidForm && (
          <div className="space-y-3 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-sm font-medium text-destructive">
              {t("confirmVoidPayment")}
            </p>
            <input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t("voidReasonOptional") as string}
              className={ic}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowVoidForm(false);
                  setVoidReason("");
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={voiding}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              >
                {voiding ? t("voiding") : t("confirmVoid")}
              </button>
            </div>
          </div>
        )}

        {!showVoidForm && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              {t("close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List views ───────────────────────────────────────────────────────────────

type ActivityTypeFilter = "all" | "sale" | "payment" | "return";

function ActivityList({ entries }: { entries: LedgerEntry[] }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("all");

  const typeFilterOptions: { id: ActivityTypeFilter; label: string }[] = [
    { id: "all", label: t("all") as string },
    { id: "sale", label: t("sales") as string },
    { id: "payment", label: t("payments") as string },
    { id: "return", label: t("returns") as string },
  ];

  const displayEntries =
    typeFilter === "all"
      ? entries
      : entries.filter((e) => e.type === typeFilter);

  return (
    <div className="space-y-4">
      {/* Type filter chips */}
      <div className="flex gap-2 flex-wrap">
        {typeFilterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTypeFilter(opt.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === opt.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {displayEntries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("noActivity")}
        </p>
      ) : (
        <div className="space-y-3">
          {displayEntries.map((entry) => {
            const isSale = entry.type === "sale";
            const isPayment = entry.type === "payment";
            const isReturn = entry.type === "return";

            let Icon = Package;
            let toneClass = "bg-muted text-muted-foreground";
            if (isSale) {
              Icon = Banknote;
              toneClass = "bg-primary/10 text-primary";
            }
            if (isPayment) {
              Icon = Coins;
              toneClass = "bg-success/15 text-success";
            }
            if (isReturn) {
              Icon = RotateCcw;
              toneClass =
                "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500";
            }

            const saleEntry = isSale ? (entry as LedgerSaleEntry) : null;
            const payEntry = isPayment ? (entry as LedgerPaymentEntry) : null;
            const retEntry = isReturn ? (entry as LedgerReturnEntry) : null;

            const isSaleVoided = saleEntry?.data.status === "VOIDED";
            const isPaymentVoided = payEntry?.data.voidedAt;
            const isVoided = isSaleVoided || isPaymentVoided;

            const headlineCents = saleEntry
              ? saleEntry.data.creditDeltaCents
              : payEntry?.data.amountCents;
            const notes =
              saleEntry?.data.notes ??
              payEntry?.data.notes ??
              retEntry?.data.notes;

            const handleClick =
              isSale && saleEntry
                ? () => navigate(`/sales/${saleEntry.data.id}`)
                : undefined;
            const isClickable = !!handleClick;

            return (
              <div
                key={`${entry.type}-${isSale ? saleEntry?.data.id : isPayment ? payEntry?.data.id : retEntry?.data.id}`}
                onClick={handleClick}
                className={`rounded-xl border border-border bg-card p-4 transition-colors ${isClickable ? "cursor-pointer hover:bg-accent/50 hover:border-primary/40" : "hover:bg-accent/30"} ${isVoided ? "bg-muted/20 opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`rounded-lg p-2 mt-0.5 ${toneClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {isSale
                          ? t("sales")
                          : isPayment
                            ? t("payments")
                            : t("returns")}
                      </p>
                      <FormattedDate
                        iso={entry.date}
                        showTime={true}
                        className="text-xs text-muted-foreground mt-0.5"
                      />
                      {saleEntry && (
                        <div className="mt-2 text-xs space-y-1">
                          {saleEntry.data.lines &&
                            saleEntry.data.lines.length > 0 && (
                              <div className="text-foreground">
                                {t("itemsSold")}: {saleEntry.data.lines.length}{" "}
                                {saleEntry.data.lines.length === 1
                                  ? t("item")
                                  : t("items")}
                              </div>
                            )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                            <span>
                              {t("total")}:{" "}
                              <span className="tabular-nums text-foreground">
                                {formatMoneyCents(saleEntry.data.subtotalCents)}
                              </span>
                            </span>
                            <span>
                              {t("paid")}:{" "}
                              <span className="tabular-nums text-success">
                                {formatMoneyCents(saleEntry.data.paidCents)}
                              </span>
                            </span>
                            <span>
                              {t("credit")}:{" "}
                              <span className="tabular-nums text-destructive">
                                {formatMoneyCents(
                                  saleEntry.data.creditDeltaCents,
                                )}
                              </span>
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {t("status")}: {saleEntry.data.status}
                          </div>
                        </div>
                      )}
                      {payEntry && (
                        <div className="mt-2">
                          <StatusChip
                            label={
                              payEntry.data.voidedAt ? t("voided") : t("active")
                            }
                            tone={
                              payEntry.data.voidedAt ? "neutral" : "success"
                            }
                          />
                        </div>
                      )}
                      {notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4 mt-2">
                  {headlineCents !== undefined && (
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          isVoided
                            ? "text-muted-foreground line-through"
                            : isSale
                              ? headlineCents > 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                              : "text-success"
                        }`}
                      >
                        {isSale
                          ? headlineCents > 0
                            ? `−${formatMoneyCents(headlineCents)}`
                            : formatMoneyCents(headlineCents)
                          : `+${formatMoneyCents(headlineCents)}`}
                      </p>
                      {isSale && (
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                          {t("creditFromSale")}
                        </p>
                      )}
                    </div>
                  )}
                  {isReturn && retEntry && (
                    <div className="text-right text-xs text-muted-foreground tabular-nums">
                      {retEntry.data.boxes > 0 && (
                        <div>
                          {retEntry.data.boxes} {t("boxes")}
                        </div>
                      )}
                      {retEntry.data.bottles > 0 && (
                        <div>
                          {retEntry.data.bottles} {t("bottles")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SalesList({
  sales,
  locale,
  onSaleClick,
}: {
  sales: LedgerSaleEntry[];
  locale?: string;
  onSaleClick: (saleId: string) => void;
}) {
  const { t } = useI18n();
  if (sales.length === 0)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("noSales")}
      </p>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">{t("date")}</th>
            <th className="px-4 py-3">{t("total")}</th>
            <th className="px-4 py-3">{t("paid")}</th>
            <th className="px-4 py-3">{t("credit")}</th>
            <th className="px-4 py-3">{t("status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((s) => {
            const isVoided = s.data.status === "VOIDED";
            return (
              <tr
                key={s.data.id}
                onClick={() => onSaleClick(s.data.id)}
                className={`cursor-pointer hover:bg-accent/30 ${isVoided ? "bg-muted/20 opacity-60" : ""}`}
              >
                <td className="px-4 py-3 font-medium">
                  <span className="text-xs text-muted-foreground block">
                    <FormattedDate iso={s.date} />
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(s.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${isVoided ? "text-muted-foreground line-through" : ""}`}
                >
                  {formatMoneyCents(s.data.subtotalCents)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-success"}`}
                >
                  {formatMoneyCents(s.data.paidCents)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-destructive"}`}
                >
                  {formatMoneyCents(s.data.creditDeltaCents)}
                </td>
                <td className="px-4 py-3">
                  <StatusChip
                    label={isVoided ? t("voided") : t("active")}
                    tone={isVoided ? "neutral" : "success"}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsList({
  payments,
  locale,
  onPaymentClick,
}: {
  payments: LedgerPaymentEntry[];
  locale?: string;
  onPaymentClick: (p: LedgerPaymentEntry) => void;
}) {
  const { t } = useI18n();

  if (payments.length === 0)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("noPayments")}
      </p>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">{t("date")}</th>
            <th className="px-4 py-3">{t("amount")}</th>
            <th className="px-4 py-3">{t("method")}</th>
            <th className="px-4 py-3">{t("status")}</th>
            <th className="px-4 py-3">{t("note")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((p) => {
            const isVoided = !!p.data.voidedAt;
            const isSaleLinked = !!p.data.saleId;
            return (
              <tr
                key={p.data.id}
                onClick={() => onPaymentClick(p)}
                className={`cursor-pointer hover:bg-accent/50 ${isVoided ? "bg-muted/20 opacity-60" : ""}`}
              >
                <td className="px-4 py-3 font-medium">
                  <span className="text-xs text-muted-foreground block">
                    <FormattedDate iso={p.date} />
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(p.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 font-semibold tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-success"}`}
                >
                  {formatMoneyCents(p.data.amountCents)}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {p.data.method.replace(/_/g, " ")}
                  </span>
                  {isSaleLinked && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <ShoppingCart className="h-2.5 w-2.5" />
                      Sale
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusChip
                    label={isVoided ? t("voided") : t("active")}
                    tone={isVoided ? "neutral" : "success"}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {p.data.notes ?? "·"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
        {t("clickToViewDetails")}
      </p>
    </div>
  );
}

function SaleDetailModal({
  saleId,
  date,
  subtotalCents,
  paidCents,
  creditDeltaCents,
  onClose,
}: {
  saleId: string;
  date: string;
  subtotalCents: number;
  paidCents: number;
  creditDeltaCents: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("sales")}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
            <ShoppingCart className="h-3 w-3" />
            {t("active")}
          </span>
        </div>
        <div className="rounded-lg border border-border divide-y divide-border">
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("date")}</span>
            <span className="text-sm">
              <FormattedDate iso={date} />
            </span>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("total")}</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatMoneyCents(subtotalCents)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("paid")}</span>
            <span className="text-sm font-semibold text-success tabular-nums">
              {formatMoneyCents(paidCents)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("credit")}</span>
            <span
              className={`text-sm font-semibold tabular-nums ${creditDeltaCents > 0 ? "text-destructive" : ""}`}
            >
              {formatMoneyCents(creditDeltaCents)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            navigate(`/sales/${saleId}`);
          }}
          className="w-full rounded-lg border border-success px-4 py-2.5 text-sm font-medium text-success hover:bg-success/10 transition-colors  inline-flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {t("viewSale")}
        </button>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaleReturnDetailModal({
  saleId,
  boxes,
  bottles,
  date,
  onClose,
}: {
  saleId: string;
  boxes: number;
  bottles: number;
  date: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("returnedOnSale")}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ShoppingCart className="h-3 w-3" />
            Sale
          </span>
        </div>
        <div className="rounded-lg border border-border divide-y divide-border">
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{t("date")}</span>
            <span className="text-sm">
              <FormattedDate iso={date} showTime={true} />
            </span>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">
              {t("fullBoxes")}
            </span>
            <span className="text-sm font-semibold tabular-nums">{boxes}</span>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <span className="text-sm text-muted-foreground">
              {t("extraBottles")}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {bottles}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            navigate(`/sales/${saleId}`);
          }}
          className="w-full rounded-lg border border-success px-4 py-2.5 text-sm font-medium text-success hover:bg-success/10 transition-colors  inline-flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {t("viewSale")}
        </button>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReturnRow {
  id: string;
  date: string;
  type: "standalone" | "sale";
  boxes: number;
  bottles: number;
  notes: string | null | undefined;
  saleId?: string;
}

function ReturnsList({
  returns,
  locale,
  onSaleClick,
}: {
  returns: ReturnRow[];
  locale?: string;
  onSaleClick: (
    saleId: string,
    boxes: number,
    bottles: number,
    date: string,
  ) => void;
}) {
  const { t } = useI18n();

  if (returns.length === 0)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("noReturns")}
      </p>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">{t("date")}</th>
            <th className="px-4 py-3">{t("fullBoxes")}</th>
            <th className="px-4 py-3">{t("extraBottles")}</th>
            <th className="px-4 py-3">{t("note")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {returns.map((r) => {
            const isSale = r.type === "sale";
            return (
              <tr
                key={r.id}
                onClick={
                  isSale
                    ? () => onSaleClick(r.saleId!, r.boxes, r.bottles, r.date)
                    : undefined
                }
                className={`${isSale ? "cursor-pointer" : ""} hover:bg-accent/30`}
              >
                <td className="px-4 py-3 font-medium">
                  <span className="text-xs text-muted-foreground block">
                    <FormattedDate iso={r.date} />
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(r.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{r.boxes}</td>
                <td className="px-4 py-3 tabular-nums">{r.bottles}</td>
                <td className="px-4 py-3">
                  {isSale ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <ShoppingCart className="h-3 w-3" />
                      {t("returnedOnSale")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {r.notes ?? "·"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { t, lang } = useI18n();
  const locale = lang === "am" ? "am-ET" : "en-US";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>("activity");
  const [smsOpen, setSmsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<LedgerPaymentEntry | null>(null);
  const [selectedReturnSale, setSelectedReturnSale] = useState<{
    saleId: string;
    boxes: number;
    bottles: number;
    date: string;
  } | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showVoided, setShowVoided] = useState(false);

  const [dateFrom, setDateFrom] = useState(getFirstOfMonthStr);
  const [dateTo, setDateTo] = useState(getTodayStr);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // recalculate() recomputes the credit balance and container counts from
      // transaction history and persists any correction, so the cards below
      // always reflect the authoritative figures on load.
      const [c, l, accts] = await Promise.all([
        sdk.customers.recalculate(id),
        sdk.customers.getLedger(id),
        sdk.paymentAccounts.list(),
      ]);
      setCustomer(c);
      setLedger(l);
      setAccounts(accts.filter((a) => a.isActive));
    } catch {
      toast.error(t("failedLoadCustomer"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const [reminding, setReminding] = useState(false);

  const handleRemind = useCallback(async () => {
    if (!id) return;
    setReminding(true);
    try {
      const res = await sdk.customers.remind(id);
      if (res.throttled) toast.warning(res.message);
      else if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("reminderFailed"));
    } finally {
      setReminding(false);
    }
  }, [id, t]);

  const handleCustomerTelegramLink = useCallback(async () => {
    if (!id) return;
    try {
      const info = await sdk.customers.telegramLink(id);
      if (!info.configured || !info.deepLink) {
        toast.error(t("telegramNotConfigured"));
        return;
      }
      await navigator.clipboard
        ?.writeText(info.deepLink)
        .catch(() => undefined);
      window.open(info.deepLink, "_blank", "noopener");
      toast.success(t("telegramLinkCopied"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("telegramLinkFailed"));
    }
  }, [id, t]);

  const filteredLedger = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    const filtered = ledger.filter((e) => {
      const d = new Date(e.date);
      if (d < from || d > to) return false;
      if (!showVoided) {
        if (
          e.type === "sale" &&
          (e as LedgerSaleEntry).data.status === "VOIDED"
        )
          return false;
        if (e.type === "payment" && (e as LedgerPaymentEntry).data.voidedAt)
          return false;
      }
      return true;
    });
    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [ledger, dateFrom, dateTo, showVoided]);

  const sales = useMemo(
    () => filteredLedger.filter((e) => e.type === "sale") as LedgerSaleEntry[],
    [filteredLedger],
  );
  const payments = useMemo(
    () =>
      filteredLedger.filter(
        (e) => e.type === "payment",
      ) as LedgerPaymentEntry[],
    [filteredLedger],
  );
  const returns = useMemo(() => {
    const rows: ReturnRow[] = [];
    for (const e of filteredLedger) {
      if (e.type === "return") {
        const r = e as LedgerReturnEntry;
        rows.push({
          id: r.data.id,
          date: r.date,
          type: "standalone",
          boxes: r.data.boxes,
          bottles: r.data.bottles,
          notes: r.data.notes,
        });
      } else if (e.type === "sale") {
        const s = e as LedgerSaleEntry;
        if (
          s.data.boxesReturnedOnSale > 0 ||
          s.data.bottlesReturnedOnSale > 0
        ) {
          rows.push({
            id: `sale-${s.data.id}`,
            date: s.date,
            type: "sale",
            boxes: s.data.boxesReturnedOnSale,
            bottles: s.data.bottlesReturnedOnSale,
            notes: null,
            saleId: s.data.id,
          });
        }
      }
    }
    return rows;
  }, [filteredLedger]);

  // Activity feed excludes payments tied to a sale · their amount is already
  // reflected in that sale's credit (subtotal − paid). Showing them separately
  // would double-count against the running balance.
  const activityEntries = useMemo(
    () =>
      filteredLedger.filter(
        (e) =>
          e.type !== "payment" || (e as LedgerPaymentEntry).data.saleId == null,
      ),
    [filteredLedger],
  );

  // Balance reconciliation computed from the full (unfiltered) ledger.
  // Invariant: balance = Σ(non-voided sale subtotals) − Σ(non-voided payments).
  const reconciliation = useMemo(() => {
    let billed = 0;
    let paid = 0;
    for (const e of ledger) {
      if (e.type === "sale") {
        const s = e as LedgerSaleEntry;
        if (s.data.status !== "VOIDED") billed += s.data.subtotalCents;
      } else if (e.type === "payment") {
        const p = e as LedgerPaymentEntry;
        if (!p.data.voidedAt) paid += p.data.amountCents;
      }
    }
    return { billed, paid, outstanding: billed - paid };
  }, [ledger]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToCustomers")}
        </button>
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {t("customerNotFound")}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span>
            {customer.name}
            {(customer as any).email && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {(customer as any).email}
                <span
                  className={`ml-1 ${(customer as any).emailVerified ? "text-success" : "text-amber-500"}`}
                >
                  {(customer as any).emailVerified ? "✓" : "Unverified"}
                </span>
              </span>
            )}
          </span>
        }
        description={`${customer.phone ?? ""} · ${customer.notes ?? ""}`}
        breadcrumb={[t("shop"), t("manageCustomers"), customer.name]}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <PermissionGate permission="customers:edit">
              <button
                type="button"
                onClick={() => setSmsOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t("sendSms")}</span>
                <span className="sm:hidden">{t("sms")}</span>
              </button>
            </PermissionGate>
            <PermissionGate permission="customers:edit">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">{t("editCustomer")}</span>
                <span className="sm:hidden">{t("edit")}</span>
              </button>
            </PermissionGate>
            {(customer as any).email && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await sdk.customers.resetPin(customer.id);
                    toast.success("PIN reset code sent to customer email");
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to reset PIN");
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
              >
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">Reset PIN</span>
                <span className="sm:hidden">Reset PIN</span>
              </button>
            )}
            <PermissionGate permission="customers:edit">
              <button
                type="button"
                onClick={() => setReturnOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">{t("newReturn")}</span>
                <span className="sm:hidden">{t("return")}</span>
              </button>
            </PermissionGate>
            <PermissionGate permission="sales:create">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/sales?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`,
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:justify-start"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">{t("newSale")}</span>
                <span className="sm:hidden">{t("sale")}</span>
              </button>
            </PermissionGate>
            <PermissionGate permission="payments:record">
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto sm:justify-start"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("newPayment")}</span>
                <span className="sm:hidden">{t("pay")}</span>
              </button>
            </PermissionGate>
          </div>
        }
      />

      {/* Stats Widgets */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Widget
            icon={Banknote}
            label={t("creditBalance")}
            value={formatMoneyCents(customer.creditBalanceCents)}
            tone={customer.creditBalanceCents > 0 ? "negative" : "default"}
            onClick={() => setPayOpen(true)}
            actionLabel={t("clickToPay") as string}
          />
          {(customer.creditBalanceCents > 0 ||
            customer.outstandingBoxes > 0 ||
            customer.outstandingBottles > 0) && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRemind}
                disabled={reminding}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                <Bell className="h-4 w-4" />
                {reminding ? t("reminding") : t("remindCustomer")}
              </button>
              <button
                type="button"
                onClick={handleCustomerTelegramLink}
                title={t("connectTelegram") as string}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <Widget
          icon={Box}
          label={t("boxesOut")}
          value={customer.outstandingBoxes.toLocaleString()}
          tone={customer.outstandingBoxes > 0 ? "warning" : "default"}
          onClick={
            customer.outstandingBoxes > 0
              ? () => setReturnOpen(true)
              : undefined
          }
          actionLabel={
            customer.outstandingBoxes > 0
              ? (t("clickToReturn") as string)
              : undefined
          }
        />
        <Widget
          icon={Wine}
          label={t("bottlesOut")}
          value={customer.outstandingBottles.toLocaleString()}
          tone={customer.outstandingBottles > 0 ? "warning" : "default"}
          onClick={
            customer.outstandingBottles > 0
              ? () => setReturnOpen(true)
              : undefined
          }
          actionLabel={
            customer.outstandingBottles > 0
              ? (t("clickToReturn") as string)
              : undefined
          }
        />
      </div>

      {/* Balance reconciliation */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("accountSummary")} · {t("allTimeLabel")}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {t("totalBilled")}:{" "}
                <span className="tabular-nums font-medium text-foreground">
                  {formatMoneyCents(reconciliation.billed)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("totalPaid")}:{" "}
                <span className="tabular-nums font-medium text-success">
                  {formatMoneyCents(reconciliation.paid)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("outstandingBalance")}:{" "}
                <span className="tabular-nums font-semibold text-destructive">
                  {formatMoneyCents(reconciliation.outstanding)}
                </span>
              </span>
            </div>
          </div>
          {reconciliation.outstanding === customer.creditBalanceCents ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("balanceVerified")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("balanceMismatch")} (
              {formatMoneyCents(customer.creditBalanceCents)})
            </span>
          )}
        </div>
      </Card>

      {/* Date filter + voided toggle */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          {t("filterByDate")}
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t("from")}</label>
          <EthiopianDateInput value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t("to")}</label>
          <EthiopianDateInput value={dateTo} onChange={setDateTo} />
        </div>
        <button
          type="button"
          onClick={() => {
            setDateFrom(getFirstOfMonthStr());
            setDateTo(getTodayStr());
          }}
          className="text-xs text-primary hover:underline"
        >
          {t("thisMonth")}
        </button>
        <button
          type="button"
          onClick={() => setShowVoided((v) => !v)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showVoided
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          {showVoided ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {t("showVoided")}
        </button>
      </div>

      {/* Tabs and Content */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-2 pt-2">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "activity", label: t("activity"), icon: Package },
              { id: "sales", label: t("sales"), icon: Banknote },
              { id: "payments", label: t("payments"), icon: Coins },
              { id: "returns", label: t("returns"), icon: RotateCcw },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === "activity" && (
            <ActivityList entries={activityEntries} locale={locale} />
          )}
          {activeTab === "sales" && (
            <SalesList
              sales={sales}
              locale={locale}
              onSaleClick={(id) => setSelectedSaleId(id)}
            />
          )}
          {activeTab === "payments" && (
            <PaymentsList
              payments={payments}
              locale={locale}
              onPaymentClick={setSelectedPayment}
            />
          )}
          {activeTab === "returns" && (
            <ReturnsList
              returns={returns}
              locale={locale}
              onSaleClick={(saleId, boxes, bottles, date) =>
                setSelectedReturnSale({ saleId, boxes, bottles, date })
              }
            />
          )}
        </div>
      </Card>

      {smsOpen && (
        <SmsModal customer={customer} onClose={() => setSmsOpen(false)} />
      )}
      {payOpen && (
        <PaymentModal
          customer={customer}
          accounts={accounts}
          onClose={() => setPayOpen(false)}
          onSaved={() => {
            setPayOpen(false);
            void fetchData();
          }}
        />
      )}
      {returnOpen && (
        <ReturnModal
          customer={customer}
          onClose={() => setReturnOpen(false)}
          onSaved={() => {
            setReturnOpen(false);
            void fetchData();
          }}
        />
      )}
      <EditCustomerDrawer
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setCustomer(updated);
          setEditOpen(false);
        }}
      />
      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          accounts={accounts}
          onClose={() => setSelectedPayment(null)}
          onVoided={() => {
            setSelectedPayment(null);
            void fetchData();
          }}
        />
      )}
      {selectedReturnSale && (
        <SaleReturnDetailModal
          saleId={selectedReturnSale.saleId}
          boxes={selectedReturnSale.boxes}
          bottles={selectedReturnSale.bottles}
          date={selectedReturnSale.date}
          onClose={() => setSelectedReturnSale(null)}
        />
      )}
      {selectedSaleId &&
        (() => {
          const sale = (sales as LedgerSaleEntry[]).find(
            (s) => s.data.id === selectedSaleId,
          );
          if (!sale) return null;
          return (
            <SaleDetailModal
              saleId={sale.data.id}
              date={sale.date}
              subtotalCents={sale.data.subtotalCents}
              paidCents={sale.data.paidCents}
              creditDeltaCents={sale.data.creditDeltaCents}
              onClose={() => setSelectedSaleId(null)}
            />
          );
        })()}
    </div>
  );
}
