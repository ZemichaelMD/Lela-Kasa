import {
  ArrowLeft,
  Banknote,
  Box,
  Coins,
  Eye,
  EyeOff,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Wine,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/data-table";
import { sdk } from "@/lib/sdk";
import type {
  Customer,
  LedgerEntry,
  LedgerPaymentEntry,
  LedgerReturnEntry,
  LedgerSaleEntry,
  PaymentAccount,
} from "@/sdk";
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

type TabId = "activity" | "sales" | "payments" | "returns";

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

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
  const [method, setMethod] = useState<PaymentMethod>('CASH');
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
        method,
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

  const methodLabels: Record<PaymentMethod, string> = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    OTHER: 'Other',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4"
      >
        <h3 className="text-base font-semibold">
          {t("recordPayment")} — {customer.name}
        </h3>

        {customer.creditBalanceCents > 0 && (
          <div className="rounded-lg bg-destructive/10 px-3.5 py-3">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">{t("creditBalance")}</p>
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
          <label className="text-sm font-medium">Payment Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} required className={ic}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{methodLabels[m]}</option>
            ))}
          </select>
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
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
          {t("recordReturn")} — {customer.name}
        </h3>

        {(customer.outstandingBoxes > 0 || customer.outstandingBottles > 0) && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3 space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">{t("pendingBoxes")} / {t("pendingBottles")}</p>
            <div className="flex gap-4 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {customer.outstandingBoxes > 0 && (
                <span>{customer.outstandingBoxes} {t("fullBoxes")}</span>
              )}
              {customer.outstandingBottles > 0 && (
                <span>{customer.outstandingBottles} {t("extraBottles")}</span>
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
              <p className="text-xs text-destructive">{t("returnExceedsBoxes")}</p>
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
              <p className="text-xs text-destructive">{t("returnExceedsBottles")}</p>
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

function EditCustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: (updated: Customer) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [username, setUsername] = useState((customer as any).username ?? "");
  const [portalPin, setPortalPin] = useState("");
  const [tierId, setTierId] = useState((customer as any).priceTierId ?? "");
  const [tierLocked, setTierLocked] = useState((customer as any).priceTierLocked ?? false);
  const [tiers, setTiers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const pinReadOnly = (customer as any).passwordChangedAt != null;

  useEffect(() => {
    sdk.priceTiers.list().then(setTiers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const dto: any = {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        priceTierId: tierId || undefined,
        priceTierLocked: tierLocked,
      };

      if (username.trim()) dto.username = username.trim();
      if (portalPin.trim() && !pinReadOnly) dto.pin = portalPin.trim();

      const updated = await sdk.customers.update(customer.id, dto);
      toast.success(t("customerUpdated"));
      onSaved(updated);
    } catch {
      toast.error(t("failedSaveCustomer"));
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
        <h3 className="text-base font-semibold">{t("editCustomer")}</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("name")} *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className={ic}
            placeholder={t("fullName") as string}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("phoneOptional")}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className={ic}
            placeholder={t("phonePlaceholder") as string}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("customerNotes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            placeholder={t("optionalNotes") as string}
          />
        </div>

        {/* Price Tier */}
        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("priceTier")}</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("defaultPriceTier")}</label>
            <select value={tierId} onChange={(e) => setTierId(e.target.value)} className={ic}>
              <option value="">— {t("none")} —</option>
              {tiers.map((tier: any) => (
                <option key={tier.id} value={tier.id}>{tier.name} ({tier.kind.toLowerCase()})</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t("autoFilledOnNewSale")}</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={tierLocked} onChange={(e) => setTierLocked(e.target.checked)} className="rounded border-border h-4 w-4" />
            <span className="text-sm">{t("lockPriceTier")}</span>
          </label>
        </div>

        {/* Portal Access */}
        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("customerPortalAccess")}</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("username")}</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className={ic} placeholder="Auto-generated from name if empty" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("portalPin")}</label>
            <input value={portalPin} onChange={e => setPortalPin(e.target.value)} type="password" maxLength={10}
              disabled={pinReadOnly}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={pinReadOnly ? "Customer has changed their PIN" : "Set a numeric PIN for customer login"} />
            {pinReadOnly && (
              <p className="text-xs text-muted-foreground">{t("pinReadOnlyHint")}</p>
            )}
          </div>
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
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── List views ───────────────────────────────────────────────────────────────

function ActivityList({
  entries,
  locale,
}: {
  entries: LedgerEntry[];
  locale?: string;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  function formatDateTime(iso: string, locale_?: string): string {
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString(locale_ ?? 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString(locale_ ?? 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${date} · ${time}`;
    } catch {
      return iso;
    }
  }

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("noActivity")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isSale = entry.type === "sale";
        const isPayment = entry.type === "payment";
        const isReturn = entry.type === "return";

        let Icon = Package;
        let toneClass = "bg-muted text-muted-foreground";
        if (isSale) { Icon = Banknote; toneClass = "bg-primary/10 text-primary"; }
        if (isPayment) { Icon = Coins; toneClass = "bg-success/15 text-success"; }
        if (isReturn) {
          Icon = RotateCcw;
          toneClass = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500";
        }

        const saleEntry = isSale ? (entry as LedgerSaleEntry) : null;
        const payEntry = isPayment ? (entry as LedgerPaymentEntry) : null;
        const retEntry = isReturn ? (entry as LedgerReturnEntry) : null;

        const isSaleVoided = saleEntry?.data.status === "VOIDED";
        const isPaymentVoided = payEntry?.data.voidedAt;
        const isVoided = isSaleVoided || isPaymentVoided;

        const amountCents = saleEntry?.data.subtotalCents ?? payEntry?.data.amountCents;
        const notes = saleEntry?.data.notes ?? payEntry?.data.notes ?? retEntry?.data.notes;

        const handleClick = isSale && saleEntry ? () => navigate(`/sales/${saleEntry.data.id}`) : undefined;
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
                    {isSale ? t("sales") : isPayment ? t("payments") : t("returns")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(entry.date, locale)}
                  </p>
                  {saleEntry && (
                    <div className="mt-2 text-xs space-y-1">
                      {saleEntry.data.lines && saleEntry.data.lines.length > 0 && (
                        <div className="text-foreground">
                          {t("itemsSold")}: {saleEntry.data.lines.length} {saleEntry.data.lines.length === 1 ? t("item") : t("items")}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        {t("status")}: {saleEntry.data.status}
                      </div>
                    </div>
                  )}
                  {payEntry && (
                    <div className="mt-2">
                      <StatusChip
                        label={payEntry.data.voidedAt ? t("voided") : t("active")}
                        tone={payEntry.data.voidedAt ? "neutral" : "success"}
                      />
                    </div>
                  )}
                  {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 mt-2">
              {amountCents !== undefined && (
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold tabular-nums ${isVoided ? "text-muted-foreground line-through" : isSale ? "text-destructive" : "text-success"}`}
                  >
                    {isSale ? "−" : "+"}
                    {formatMoneyCents(amountCents)}
                  </p>
                </div>
              )}
              {isReturn && retEntry && (
                <div className="text-right text-xs text-muted-foreground tabular-nums">
                  {retEntry.data.boxes > 0 && <div>{retEntry.data.boxes} {t("boxes")}</div>}
                  {retEntry.data.bottles > 0 && <div>{retEntry.data.bottles} {t("bottles")}</div>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesList({
  sales,
  locale,
}: {
  sales: LedgerSaleEntry[];
  locale?: string;
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
              <tr key={s.data.id} className={`hover:bg-accent/30 ${isVoided ? "bg-muted/20 opacity-60" : ""}`}>
                <td className="px-4 py-3 font-medium">
                  <FormattedDate iso={s.date} />
                </td>
                <td className={`px-4 py-3 tabular-nums ${isVoided ? "text-muted-foreground line-through" : ""}`}>
                  {formatMoneyCents(s.data.subtotalCents)}
                </td>
                <td className={`px-4 py-3 tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-success"}`}>
                  {formatMoneyCents(s.data.paidCents)}
                </td>
                <td className={`px-4 py-3 tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-destructive"}`}>
                  {formatMoneyCents(s.data.subtotalCents - s.data.paidCents)}
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
}: {
  payments: LedgerPaymentEntry[];
  locale?: string;
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
            <th className="px-4 py-3">{t("status")}</th>
            <th className="px-4 py-3">{t("note")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((p) => {
            const isVoided = !!p.data.voidedAt;
            return (
              <tr
                key={p.data.id}
                className={`hover:bg-accent/30 ${isVoided ? "bg-muted/20 opacity-60" : ""}`}
              >
                <td className="px-4 py-3 font-medium">
                  <FormattedDate iso={p.date} />
                </td>
                <td className={`px-4 py-3 font-semibold tabular-nums ${isVoided ? "text-muted-foreground line-through" : "text-success"}`}>
                  {formatMoneyCents(p.data.amountCents)}
                </td>
                <td className="px-4 py-3">
                  <StatusChip
                    label={isVoided ? t("voided") : t("active")}
                    tone={isVoided ? "neutral" : "success"}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.data.notes ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReturnsList({
  returns,
  locale,
}: {
  returns: LedgerReturnEntry[];
  locale?: string;
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
          {returns.map((r) => (
            <tr key={r.data.id} className="hover:bg-accent/30">
              <td className="px-4 py-3 font-medium">
                <FormattedDate iso={r.date} />
              </td>
              <td className="px-4 py-3 tabular-nums">{r.data.boxes}</td>
              <td className="px-4 py-3 tabular-nums">{r.data.bottles}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.data.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { t, lang } = useI18n();
  const locale = lang === 'am' ? 'am-ET' : 'en-US';
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

  const [dateFrom, setDateFrom] = useState(getFirstOfMonthStr);
  const [dateTo, setDateTo] = useState(getTodayStr);
  const [showVoided, setShowVoided] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, l, accts] = await Promise.all([
        sdk.customers.findOne(id),
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

  const filteredLedger = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    const filtered = ledger.filter((e) => {
      const d = new Date(e.date);
      if (d < from || d > to) return false;
      if (!showVoided) {
        if (e.type === "sale" && (e as LedgerSaleEntry).data.status === "VOIDED") return false;
        if (e.type === "payment" && (e as LedgerPaymentEntry).data.voidedAt) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, dateFrom, dateTo, showVoided]);

  const sales = useMemo(
    () => filteredLedger.filter((e) => e.type === "sale") as LedgerSaleEntry[],
    [filteredLedger],
  );
  const payments = useMemo(
    () => filteredLedger.filter((e) => e.type === "payment") as LedgerPaymentEntry[],
    [filteredLedger],
  );
  const returns = useMemo(
    () => filteredLedger.filter((e) => e.type === "return") as LedgerReturnEntry[],
    [filteredLedger],
  );

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
        title={customer.name}
        description={`${customer.phone ?? ""} · ${customer.notes ?? ""}`}
        breadcrumb={[t("shop"), t("manageCustomers"), customer.name]}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setSmsOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t("sendSms")}</span>
              <span className="sm:hidden">{t("sms")}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">{t("editCustomer")}</span>
              <span className="sm:hidden">{t("edit")}</span>
            </button>
            <button
              type="button"
              onClick={() => setReturnOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent sm:justify-start"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("newReturn")}</span>
              <span className="sm:hidden">{t("return")}</span>
            </button>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto sm:justify-start"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("newPayment")}</span>
              <span className="sm:hidden">{t("pay")}</span>
            </button>
          </div>
        }
      />

      {/* Stats Widgets */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Widget
          icon={Banknote}
          label={t("creditBalance")}
          value={formatMoneyCents(customer.creditBalanceCents)}
          tone={customer.creditBalanceCents > 0 ? "negative" : "default"}
          onClick={() => setPayOpen(true)}
          actionLabel={t("clickToPay") as string}
        />
        <Widget
          icon={Box}
          label={t("boxesOut")}
          value={customer.outstandingBoxes.toLocaleString()}
          tone={customer.outstandingBoxes > 0 ? "warning" : "default"}
          onClick={customer.outstandingBoxes > 0 ? () => setReturnOpen(true) : undefined}
          actionLabel={customer.outstandingBoxes > 0 ? (t("clickToReturn") as string) : undefined}
        />
        <Widget
          icon={Wine}
          label={t("bottlesOut")}
          value={customer.outstandingBottles.toLocaleString()}
          tone={customer.outstandingBottles > 0 ? "warning" : "default"}
          onClick={customer.outstandingBottles > 0 ? () => setReturnOpen(true) : undefined}
          actionLabel={customer.outstandingBottles > 0 ? (t("clickToReturn") as string) : undefined}
        />
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">{t("filterByDate")}</span>
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
          onClick={() => { setDateFrom(getFirstOfMonthStr()); setDateTo(getTodayStr()); }}
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
          {showVoided ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
            <ActivityList entries={filteredLedger} locale={locale} />
          )}
          {activeTab === "sales" && <SalesList sales={sales} locale={locale} />}
          {activeTab === "payments" && (
            <PaymentsList payments={payments} locale={locale} />
          )}
          {activeTab === "returns" && (
            <ReturnsList returns={returns} locale={locale} />
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
      {editOpen && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setCustomer(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
