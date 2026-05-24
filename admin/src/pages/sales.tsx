import {
  Calendar,
  Copy,
  Download,
  Eye,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ActionMenu } from "@/components/action-menu";
import {
  DataTable,
  StatusChip,
  type StatusTone,
} from "@/components/data-table";
import { LangToggle } from "@/components/lang-toggle";
import { PageHeader } from "@/components/page-header";
import { useAuthContext } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { sdk } from "@/lib/sdk";
import { ApiError } from "@/sdk";
import type {
  Beverage,
  Customer,
  CurrentTierPrice,
  PaymentAccount,
  PriceTier,
  Sale,
} from "@/sdk";
import { EthiopianDateInput, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSaleTime(iso: string, locale = 'en-US'): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function statusTone(status: string): StatusTone {
  if (status === "CONFIRMED") return "success";
  if (status === "OPEN") return "warning";
  return "neutral";
}

// Build "2× Harar · 1× St. George" style summary from sale lines + beverages map
function buildItemsSummary(
  sale: Sale,
  beveragesMap: Map<string, Beverage>,
): { summary: string; full: string } {
  const parts = sale.lines.map((l) => {
    const bev = beveragesMap.get(l.beverageId);
    const name = bev?.name ?? "Unknown";
    const qty =
      (l.boxes > 0 ? `${l.boxes}b` : "") +
      (l.bottles > 0 ? ` ${l.bottles}btl` : "");
    return `${qty.trim()} ${name}`;
  });
  const full = parts.join(" · ");
  const MAX = 3;
  if (parts.length <= MAX) return { summary: full, full };
  const shown = parts.slice(0, MAX).join(" · ");
  return { summary: `${shown} +${parts.length - MAX} more`, full };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleLine {
  beverageId: string;
  boxes: number;
  bottles: number;
}

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "OTHER";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_MONEY: "Mobile Money",
  OTHER: "Other",
};

interface SalePaymentRow {
  amountCents: number;
  amountInput: string;
  paymentAccountId: string;
  method: PaymentMethod;
}

interface DrawerState {
  open: boolean;
  mode: "create" | "edit" | "duplicate";
  sale: Sale | null; // used when editing/duplicating
}

// ─── Void Dialog ──────────────────────────────────────────────────────────────

interface VoidDialogProps {
  sale: Sale | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  voiding: boolean;
}

function VoidDialog({ sale, onConfirm, onCancel, voiding }: VoidDialogProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (sale) setReason("");
  }, [sale]);
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t('voidQuestion')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('saleFrom')} <strong><FormattedDate iso={sale.createdAt} /></strong> {t('voidWarning')}
        </p>
        <div className="mt-3 space-y-1.5">
          <label className="text-sm font-medium">{t('voidReason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            placeholder={t('enterReason') as string}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={voiding}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90"
          >
            {voiding ? t('voiding') : t('confirmVoid')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New/Edit Sale Drawer ─────────────────────────────────────────────────────

interface SaleDrawerProps {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
  customers: Customer[];
  beverages: Beverage[];
  priceTiers: PriceTier[];
  paymentAccounts: PaymentAccount[];
  defaultPriceTierId: string;
  onCustomerCreated: (customer: Customer) => void;
}

function SaleDrawer({
  state,
  onClose,
  onSaved,
  customers,
  beverages,
  priceTiers,
  paymentAccounts,
  defaultPriceTierId,
  onCustomerCreated,
}: SaleDrawerProps) {
  const { open, mode, sale } = state;
  const { t, locale } = useI18n();

  const isEdit = mode === "edit";
  const isDuplicate = mode === "duplicate";

  // form fields
  const [saleDate, setSaleDate] = useState(todayIso());
  const [customerId, setCustomerId] = useState("");
  const [priceTierId, setPriceTierId] = useState(defaultPriceTierId);
  const [lines, setLines] = useState<SaleLine[]>([
    { beverageId: "", boxes: 0, bottles: 0 },
  ]);
  const [paymentRows, setPaymentRows] = useState<SalePaymentRow[]>([]);
  const [boxesReturned, setBoxesReturned] = useState(0);
  const [bottlesReturned, setBottlesReturned] = useState(0);
  const [boxBrand, setBoxBrand] = useState("");
  const [note, setNote] = useState("");
  const [applyCredit, setApplyCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // customer combobox / add
  const [customerInput, setCustomerInput] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  // beverage prices cache: beverageId -> per-tier prices[]
  const [pricesCache, setPricesCache] = useState<
    Map<string, CurrentTierPrice[]>
  >(new Map());

  // Reset form when drawer opens
  useEffect(() => {
    if (!open) return;
    const src = sale && (isEdit || isDuplicate) ? sale : null;
    setSaleDate(
      isDuplicate ? todayIso() : src ? src.createdAt.slice(0, 10) : todayIso(),
    );
    setCustomerId(src?.customerId ?? "");
    setPriceTierId(src?.priceTierId ?? defaultPriceTierId);
    setNote(src?.notes ?? "");
    setApplyCredit(false);
    setCustomerInput("");
    setCustomerOpen(false);
    setShowAddCustomer(false);
    setNewCustName("");
    setNewCustPhone("");
    setBoxesReturned(0);
    setBottlesReturned(0);
    setBoxBrand("");

    if (src && src.lines.length > 0) {
      setLines(
        src.lines.map((l) => ({
          beverageId: l.beverageId,
          boxes: l.boxes,
          bottles: l.bottles,
        })),
      );
    } else {
      setLines([{ beverageId: "", boxes: 0, bottles: 0 }]);
    }
    setPaymentRows([]);
  }, [open, sale, isEdit, isDuplicate, defaultPriceTierId]);

  // Load beverage prices when price tier or lines change
  useEffect(() => {
    if (!open) return;
    const uniqueBevIds = [
      ...new Set(lines.map((l) => l.beverageId).filter(Boolean)),
    ];
    for (const bId of uniqueBevIds) {
      if (!pricesCache.has(bId)) {
        sdk.beverages
          .getCurrentPrices(bId)
          .then((prices) => {
            setPricesCache((prev) => new Map(prev).set(bId, prices));
          })
          .catch(() => {});
      }
    }
  }, [open, lines, pricesCache]);

  function getPriceForLine(line: SaleLine) {
    const entries = pricesCache.get(line.beverageId) ?? [];
    return entries.find((e) => e.tier.id === priceTierId)?.currentPrice ?? null;
  }

  function computeLineTotal(line: SaleLine): number {
    const price = getPriceForLine(line);
    if (!price) return 0;
    return (
      line.boxes * price.pricePerBoxCents +
      line.bottles * price.pricePerBottleCents
    );
  }

  // If user enters more bottles than one box holds AND the per-bottle price is
  // equivalent to (boxPrice / bottlesPerBox), fold the excess bottles into boxes.
  function maybeFoldBottlesIntoBoxes(idx: number) {
    setLines((prev) => {
      const line = prev[idx];
      if (!line || !line.beverageId) return prev;
      const bev = beverages.find((b) => b.id === line.beverageId);
      const price = (() => {
        const entries = pricesCache.get(line.beverageId) ?? [];
        return (
          entries.find((e) => e.tier.id === priceTierId)?.currentPrice ?? null
        );
      })();
      if (!bev || !price) return prev;
      const perBox = bev.bottlesPerBox || 0;
      if (perBox <= 0 || line.bottles < perBox) return prev;
      if (price.pricePerBottleCents * perBox !== price.pricePerBoxCents)
        return prev;
      const extraBoxes = Math.floor(line.bottles / perBox);
      const remBottles = line.bottles % perBox;
      return prev.map((l, i) =>
        i === idx
          ? { ...l, boxes: l.boxes + extraBoxes, bottles: remBottles }
          : l,
      );
    });
  }

  const subtotalCents = lines.reduce((acc, l) => acc + computeLineTotal(l), 0);
  const paidCents = paymentRows.reduce(
    (acc, r) => acc + (r.amountCents || 0),
    0,
  );
  const creditDelta = subtotalCents - paidCents;

  // Line helpers
  function updateLine(idx: number, patch: Partial<SaleLine>) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  }
  function addLine() {
    setLines((prev) => [...prev, { beverageId: "", boxes: 0, bottles: 0 }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  // Payment helpers
  function addPaymentRow() {
    setPaymentRows((prev) => [
      ...prev,
      {
        amountCents: 0,
        amountInput: "",
        paymentAccountId: paymentAccounts[0]?.id ?? "",
        method: "CASH",
      },
    ]);
  }
  function updatePaymentRow(idx: number, patch: Partial<SalePaymentRow>) {
    setPaymentRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }
  function removePaymentRow(idx: number) {
    setPaymentRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // Add new customer inline
  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setAddingCustomer(true);
    try {
      const created = await sdk.customers.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
      });
      toast.success(t('customerCreated'));
      onCustomerCreated(created);
      setCustomerId(created.id);
      setShowAddCustomer(false);
      setNewCustName("");
      setNewCustPhone("");
    } catch {
      toast.error(t('failedCreateCustomer'));
    } finally {
      setAddingCustomer(false);
    }
  }

  async function handleSubmit(status: "OPEN" | "CONFIRMED") {
    if (!customerId) {
      toast.error(t('selectCustomerRequired'));
      return;
    }
    const validLines = lines.filter(
      (l) => l.beverageId && (l.boxes > 0 || l.bottles > 0),
    );
    if (validLines.length === 0) {
      toast.error(t('addAtLeastOneBeverage'));
      return;
    }
    if (!priceTierId) {
      toast.error(t('selectPriceTierRequired'));
      return;
    }
    // Flag any selected lines missing a price in this tier — block submit.
    const missingPrice = validLines.filter((l) => !getPriceForLine(l));
    if (missingPrice.length > 0) {
      const names = missingPrice
        .map((l) => beverages.find((b) => b.id === l.beverageId)?.name ?? "?")
        .join(", ");
      toast.error(`${t('noPriceSetForBeverages')}: ${names}`);
      return;
    }
    setSubmitting(true);
    try {
      // Box brand is stored as a "Box: <brand>" line prefix on notes (no schema change).
      const composedNotes = [
        boxBrand.trim() ? `Box: ${boxBrand.trim()}` : null,
        note.trim() || null,
      ]
        .filter(Boolean)
        .join("\n");
      const validPayments = paymentRows.filter(
        (r) => r.amountCents > 0 && r.paymentAccountId,
      );

      const dto = {
        saleDate,
        customerId,
        priceTierId,
        lines: validLines.map((l) => ({
          beverageId: l.beverageId,
          boxes: l.boxes || 0,
          bottles: l.bottles || 0,
        })),
        notes: composedNotes || undefined,
        boxesReturnedOnSale: boxesReturned,
        bottlesReturnedOnSale: bottlesReturned,
        applyCredit,
        payments: validPayments.map((r) => ({
          paymentAccountId: r.paymentAccountId,
          amountCents: r.amountCents,
          method: r.method,
        })),
      };

      if (isEdit && sale?.id) {
        await sdk.sales.update(sale.id, { ...dto, draft: status === "OPEN" });
      } else {
        await sdk.sales.create(dto);
      }

      if (isEdit) {
        if (status === "CONFIRMED") {
          toast.success(t('saleUpdatedAndConfirmed'));
        } else {
          toast.success(t('saleDraftUpdated'));
        }
      } else {
        if (status === "CONFIRMED") {
          toast.success(t('saleConfirmed'));
        } else {
          toast.success(t('draftSaved'));
        }
      }

      onSaved();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status < 500) {
        toast.error(err.message);
      } else {
        toast.error(t('failedSaveSale'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const filteredCustomers = customerInput.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerInput.toLowerCase()),
      )
    : customers;

  function pickCustomer(c: Customer | null) {
    setCustomerId(c?.id ?? "");
    setCustomerInput(c?.name ?? "");
    setCustomerOpen(false);
  }

  const drawerTitle =
    mode === "edit"
      ? t("editSale")
      : mode === "duplicate"
        ? t("duplicateSale")
        : t("newSale");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-card shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-modal="true"
        role="dialog"
        aria-label={drawerTitle}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{drawerTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {/* Sale date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("saleDate")} *</label>
            <EthiopianDateInput value={saleDate} onChange={setSaleDate} className="w-full h-10" />
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">
                {t("customer")} <span className="text-destructive">*</span>
              </label>
              {!showAddCustomer && (
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('newCustomer')}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                ref={customerInputRef}
                type="text"
                value={
                  customerOpen
                    ? customerInput
                    : (selectedCustomer?.name ?? customerInput)
                }
                onChange={(e) => {
                  setCustomerInput(e.target.value);
                  setCustomerOpen(true);
                  if (customerId && e.target.value !== selectedCustomer?.name) {
                    setCustomerId("");
                  }
                }}
                onFocus={() => {
                  setCustomerOpen(true);
                  setCustomerInput("");
                }}
                onBlur={() => {
                  // Delay so click on a list option can register first.
                  window.setTimeout(() => setCustomerOpen(false), 120);
                }}
                placeholder={t('searchPickCustomer') as string}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              {customerId && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickCustomer(null);
                  }}
                  aria-label={t('cancel') as string}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  ✕
                </button>
              )}
              {customerOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      {t('noMatches')} {customerInput && t('useAddNewCustomer')}
                    </p>
                  ) : (
                    <ul className="py-1 text-sm">
                      {filteredCustomers.slice(0, 50).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickCustomer(c);
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent ${
                              c.id === customerId ? "bg-accent/60" : ""
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            {c.phone && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {c.phone}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {showAddCustomer && (
              <form
                onSubmit={handleAddCustomer}
                className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {t('newCustomer')}
                </p>
                <input
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder={t('nameWithAsterisk') as string}
                  required
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <input
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder={t('phone') as string}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingCustomer}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {addingCustomer ? t('adding') : t('add')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Price tier */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("priceTier")} *</label>
            <select
              value={priceTierId}
              onChange={(e) => setPriceTierId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">{t('selectTier')}</option>
              {priceTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                  {tier.isDefault ? ` (${t('default')})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Lines section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("items")} *</label>
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-primary hover:underline"
              >
                + {t("addLine")}
              </button>
            </div>
            {lines.map((line, idx) => {
              const price = getPriceForLine(line);
              const lineTotal = computeLineTotal(line);
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={line.beverageId}
                      onChange={(e) =>
                        updateLine(idx, { beverageId: e.target.value })
                      }
                      className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="">{t('selectBeveragePlaceholder')}</option>
                      {beverages.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                          {b.brand ? ` (${b.brand})` : ""}
                        </option>
                      ))}
                    </select>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {t("boxes")}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={line.boxes}
                        onChange={(e) =>
                          updateLine(idx, { boxes: Number(e.target.value) })
                        }
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {t("bottles")}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={line.bottles}
                        onChange={(e) =>
                          updateLine(idx, { bottles: Number(e.target.value) })
                        }
                        onBlur={() => maybeFoldBottlesIntoBoxes(idx)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {t('lineTotal')}
                      </label>
                      <div className="flex h-9 items-center px-2 text-sm font-medium">
                        {formatMoneyCents(lineTotal)}
                      </div>
                    </div>
                  </div>
                  {price && (
                    <p className="text-xs text-muted-foreground">
                      {formatMoneyCents(price.pricePerBoxCents)}/{t('box')} ·{" "}
                      {formatMoneyCents(price.pricePerBottleCents)}/{t('bottle')}
                    </p>
                  )}
                  {line.beverageId && !price && (
                    <p className="text-xs text-warning">
                      {t('noPriceSet')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live totals card */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              {t('total')}
            </p>
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span className="font-medium">
                {formatMoneyCents(subtotalCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('paid')}</span>
              <span className="font-medium">{formatMoneyCents(paidCents)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span>{t('credit')}</span>
              <span
                className={
                  creditDelta > 0
                    ? "font-semibold text-destructive"
                    : creditDelta < 0
                      ? "font-semibold text-success"
                      : "text-muted-foreground"
                }
              >
                {formatMoneyCents(creditDelta)}
              </span>
            </div>
          </div>

          {/* Payments section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('payments')}</label>
              <button
                type="button"
                onClick={addPaymentRow}
                className="text-xs text-primary hover:underline"
              >
                + {t('addPayment')}
              </button>
            </div>
            {paymentRows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-border p-2"
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={0.01}
                  placeholder={t('amount') as string}
                  value={row.amountInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = parseFloat(raw);
                    updatePaymentRow(idx, {
                      amountInput: raw,
                      amountCents: isNaN(parsed) ? 0 : Math.round(parsed * 100),
                    });
                  }}
                  className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <select
                  value={row.paymentAccountId}
                  onChange={(e) =>
                    updatePaymentRow(idx, { paymentAccountId: e.target.value })
                  }
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">{t('accountPlaceholder')}</option>
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <select
                  value={row.method}
                  onChange={(e) =>
                    updatePaymentRow(idx, {
                      method: e.target.value as PaymentMethod,
                    })
                  }
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                    (m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ),
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => removePaymentRow(idx)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Container returns */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('containers')}?</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t('returnBoxes')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={boxesReturned}
                  onChange={(e) => setBoxesReturned(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t('returnBottles')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={bottlesReturned}
                  onChange={(e) => setBottlesReturned(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t('boxBrandType')} <span className="opacity-70">({t('optional')})</span>
              </label>
              <input
                type="text"
                value={boxBrand}
                onChange={(e) => setBoxBrand(e.target.value)}
                placeholder={t('boxBrandPlaceholder') as string}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('note')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder={t('optionalNote') as string}
            />
          </div>

          {/* Apply credit toggle */}
          {selectedCustomer && selectedCustomer.creditBalanceCents > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyCredit}
                onChange={(e) => setApplyCredit(e.target.checked)}
                className="rounded border-border"
              />
              {t('applyExistingCredit')} (
              {formatMoneyCents(selectedCustomer.creditBalanceCents)})
            </label>
          )}

          {/* Projected balances */}
          {selectedCustomer && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                {t('projectedBalancesFor')} {selectedCustomer.name}
              </p>
              <div className="flex justify-between">
                <span>{t('currentCredit')}</span>
                <span>
                  {formatMoneyCents(selectedCustomer.creditBalanceCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('afterThisSale')}</span>
                <span
                  className={
                    selectedCustomer.creditBalanceCents + creditDelta > 0
                      ? "font-semibold text-destructive"
                      : "font-semibold text-success"
                  }
                >
                  {formatMoneyCents(
                    selectedCustomer.creditBalanceCents + creditDelta,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('boxesOutstanding')}</span>
                <span>{selectedCustomer.outstandingBoxes}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('bottlesOutstanding')}</span>
                <span>{selectedCustomer.outstandingBottles}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("OPEN")}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60 hover:bg-accent"
          >
            {submitting ? t('saving') : t('saveAsDraft')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("CONFIRMED")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
          >
            {submitting ? t('saving') : t('confirmSale')}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Mobile Sale Card ──────────────────────────────────────────────────────────

interface SaleCardProps {
  sale: Sale;
  beveragesMap: Map<string, Beverage>;
  customersMap: Map<string, Customer>;
  onView: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  onVoid: (sale: Sale) => void;
  onDuplicate: (sale: Sale) => void;
  canModify: boolean;
}

function SaleCard({
  sale,
  beveragesMap,
  customersMap,
  onView,
  onEdit,
  onVoid,
  onDuplicate,
  canModify,
}: SaleCardProps) {
  const { t } = useI18n();
  const customer = sale.customerId
    ? customersMap.get(sale.customerId)
    : undefined;
  const { summary, full } = buildItemsSummary(sale, beveragesMap);

  return (
    <button
      type="button"
      onClick={() => onView(sale)}
      className="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm active:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {customer?.name ?? t('walkIn')}
          </p>
          <p className="text-[11px] text-muted-foreground">
            <FormattedDate iso={sale.createdAt} />
          </p>
        </div>
        <StatusChip label={sale.status} tone={statusTone(sale.status)} />
      </div>
      <p
        className="mt-1 line-clamp-1 text-[11px] text-muted-foreground"
        title={full}
      >
        {summary || t('noItems')}
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold tabular-nums">
          {formatMoneyCents(sale.subtotalCents)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {t('paid')} {formatMoneyCents(sale.paidCents)}
        </span>
        <span
          className={
            sale.creditDeltaCents > 0
              ? "font-medium text-destructive tabular-nums"
              : sale.creditDeltaCents < 0
                ? "font-medium text-success tabular-nums"
                : "text-muted-foreground tabular-nums"
          }
        >
          {sale.creditDeltaCents > 0 ? "+" : ""}
          {formatMoneyCents(sale.creditDeltaCents)}
        </span>
      </div>
      {(canModify || true) && (
        <div className="mt-2 flex gap-1.5">
          {canModify && sale.status !== "VOIDED" && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(sale);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(sale);
                  }
                }}
                className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
              >
                {t('edit')}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onVoid(sale);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onVoid(sale);
                  }
                }}
                className="rounded border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
              >
                {t('void')}
              </span>
            </>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(sale);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onDuplicate(sale);
              }
            }}
            className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
          >
            {t('duplicateSale')}
          </span>
        </div>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Admin Sales View ──────────────────────────────────────────────────────────

function AdminSalesView() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [sales, setSales] = useState<import('@/sdk').AdminSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    sdk.admin.listSales()
      .then(setSales)
      .catch(() => toast.error(t('failedLoadSales')))
      .finally(() => setLoading(false));
  }, [t]);

  const columns = [
    {
      key: 'date',
      header: t('date'),
      render: (s: import('@/sdk').AdminSale) => (
        <span className="whitespace-nowrap"><FormattedDate iso={s.saleDate} /></span>
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      render: (s: import('@/sdk').AdminSale) => (
        <span className="font-medium">{s.shop?.name ?? '—'}</span>
      ),
    },
    {
      key: 'customer',
      header: t('customer'),
      render: (s: import('@/sdk').AdminSale) => (
        <span>{s.customer?.name ?? t('walkIn')}</span>
      ),
    },
    {
      key: 'total',
      header: t('total'),
      render: (s: import('@/sdk').AdminSale) => (
        <span className="font-medium tabular-nums">{formatMoneyCents(s.totalCents)}</span>
      ),
    },
    {
      key: 'paid',
      header: t('paid'),
      render: (s: import('@/sdk').AdminSale) => (
        <span className="tabular-nums">{formatMoneyCents(s.paidCents)}</span>
      ),
    },
    {
      key: 'balance',
      header: t('credit'),
      render: (s: import('@/sdk').AdminSale) => (
        <span className={`tabular-nums ${s.balanceCents > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {formatMoneyCents(s.balanceCents)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (s: import('@/sdk').AdminSale) => (
        <StatusChip label={s.status} tone={statusTone(s.status)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (s: import('@/sdk').AdminSale) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/sales/${s.id}`); }}
          className="rounded p-1.5 text-muted-foreground hover:bg-accent"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Transactions"
        description="Platform-wide sales across all shops"
        breadcrumb={['Platform', 'Sales']}
      />
      <DataTable
        columns={columns}
        rows={sales}
        searchPlaceholder={t('searchSales') as string}
        empty={loading ? t('loading') : 'No transactions found'}
      />
    </div>
  );
}

export default function SalesPage() {
  const { user } = useAuthContext();
  if (user?.role === 'SUPER_ADMIN') {
    return <AdminSalesView />;
  }
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { shop } = useAuthContext();
  const isOwner = user?.role === "OWNER";
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state from URL
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [filterCustomerId, setFilterCustomerId] = useState(
    searchParams.get("customerId") ?? "",
  );
  const [filterPaymentAccountId, setFilterPaymentAccountId] = useState(
    searchParams.get("paymentAccountId") ?? "",
  );
  const [filterStatuses, setFilterStatuses] = useState<string[]>(
    searchParams.get("status") ? searchParams.get("status")!.split(",") : [],
  );
  const [hasCredit, setHasCredit] = useState(
    searchParams.get("hasCredit") === "true",
  );
  const [page, setPage] = useState(1);

  // Data state
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  // Maps for quick lookup
  const beveragesMap = new Map(beverages.map((b) => [b.id, b]));
  const customersMap = new Map(customers.map((c) => [c.id, c]));

  // Drawer
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: "create",
    sale: null,
  });

  // Void dialog
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voiding, setVoiding] = useState(false);

  // Mobile filter panel collapsed by default; expanded on demand.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPage(1);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set("q", value);
          else next.delete("q");
          return next;
        });
      }, 300);
    },
    [setSearchParams],
  );

  // Sync filter changes → URL
  function setParam(key: string, value: string | undefined) {
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  function handleDateQuick(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("dateFrom", from);
      next.set("dateTo", to);
      return next;
    });
  }

  function toggleStatus(s: string) {
    const next = filterStatuses.includes(s)
      ? filterStatuses.filter((x) => x !== s)
      : [...filterStatuses, s];
    setFilterStatuses(next);
    setParam("status", next.join(",") || undefined);
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setFilterCustomerId("");
    setFilterPaymentAccountId("");
    setFilterStatuses([]);
    setHasCredit(false);
    setPage(1);
    setSearchParams({});
  }

  // Load reference data once
  useEffect(() => {
    async function loadRef() {
      setRefLoading(true);
      try {
        const [custRes, bevRes, tiersRes, accsRes] = await Promise.all([
          sdk.customers.list({ pageSize: 500 }),
          sdk.beverages.list({ pageSize: 500, isActive: true }),
          sdk.priceTiers.list(),
          sdk.paymentAccounts.list(),
        ]);
        setCustomers(custRes.data);
        setBeverages(bevRes.data);
        setPriceTiers(tiersRes);
        setPaymentAccounts(accsRes);
      } catch {
        toast.error(t('failedLoadReferenceData'));
      } finally {
        setRefLoading(false);
      }
    }
    void loadRef();
  }, [t]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sdk.sales.list({
        page,
        pageSize: PAGE_SIZE,
        search: searchParams.get("q") ?? undefined,
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo: searchParams.get("dateTo") ?? undefined,
        customerId: searchParams.get("customerId") ?? undefined,
        paymentAccountId: searchParams.get("paymentAccountId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        hasCredit: searchParams.get("hasCredit") === "true" ? true : undefined,
      });
      setSales(result.data);
      setTotal(result.total);
    } catch {
      toast.error(t('failedLoadSales'));
    } finally {
      setLoading(false);
    }
  }, [page, searchParams, t]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  // Cmd/Ctrl+K → open new sale
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCreate();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function openCreate() {
    setDrawerState({ open: true, mode: "create", sale: null });
  }
  function openEdit(sale: Sale) {
    setDrawerState({ open: true, mode: "edit", sale });
  }
  function openDuplicate(sale: Sale) {
    setDrawerState({ open: true, mode: "duplicate", sale });
  }
  function closeDrawer() {
    setDrawerState((s) => ({ ...s, open: false }));
  }

  function handleSaved() {
    closeDrawer();
    void fetchSales();
  }

  async function handleVoid(reason: string) {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await sdk.sales.void(voidTarget.id, reason);
      toast.success(t('saleVoided'));
      setVoidTarget(null);
      void fetchSales();
    } catch {
      toast.error(t('failedVoidSale'));
    } finally {
      setVoiding(false);
    }
  }

  async function handleExportCsv() {
    try {
      const res = await sdk.sales.exportCsv({
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo: searchParams.get("dateTo") ?? undefined,
        customerId: searchParams.get("customerId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${todayIso()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('failedExportCsv'));
    }
  }

  const defaultPriceTierId =
    priceTiers.find((t) => t.isDefault)?.id ?? priceTiers[0]?.id ?? "";

  const activeFilterCount =
    (searchParams.get("q") ? 1 : 0) +
    (searchParams.get("dateFrom") || searchParams.get("dateTo") ? 1 : 0) +
    (searchParams.get("customerId") ? 1 : 0) +
    (searchParams.get("paymentAccountId") ? 1 : 0) +
    (searchParams.get("status") ? 1 : 0) +
    (hasCredit ? 1 : 0);

  // Desktop columns
  const columns = [
    {
      key: "date",
      header: t('date'),
      render: (s: Sale) => (
        <div className="whitespace-nowrap">
          <p><FormattedDate iso={s.createdAt} /></p>
          <p className="text-xs text-muted-foreground">
            {formatSaleTime(s.createdAt, locale)}
          </p>
        </div>
      ),
    },
    {
      key: "customer",
      header: t('customer'),
      render: (s: Sale) => {
        const c = s.customerId ? customersMap.get(s.customerId) : undefined;
        if (!c) {
          return <p className="font-medium">{t('walkIn')}</p>;
        }
        return (
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/customers/${c.id}`);
              }}
              className="font-medium text-left hover:underline"
            >
              {c.name}
            </button>
            {c.phone && (
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "items",
      header: t('items'),
      render: (s: Sale) => {
        const { summary, full } = buildItemsSummary(s, beveragesMap);
        return (
          <span className="text-xs text-muted-foreground" title={full}>
            {summary || "—"}
          </span>
        );
      },
    },
    {
      key: "total",
      header: t('total'),
      render: (s: Sale) => (
        <span className="whitespace-nowrap font-medium">
          {formatMoneyCents(s.subtotalCents)}
        </span>
      ),
    },
    {
      key: "paid",
      header: t('paid'),
      render: (s: Sale) => (
        <span className="whitespace-nowrap">
          {formatMoneyCents(s.paidCents)}
        </span>
      ),
    },
    {
      key: "credit",
      header: t('credit'),
      render: (s: Sale) => (
        <span
          className={
            s.creditDeltaCents > 0
              ? "whitespace-nowrap font-medium text-destructive"
              : s.creditDeltaCents < 0
                ? "whitespace-nowrap font-medium text-success"
                : "whitespace-nowrap text-muted-foreground"
          }
        >
          {formatMoneyCents(s.creditDeltaCents)}
        </span>
      ),
    },
    {
      key: "containers",
      header: t('containers'),
      render: (s: Sale) => {
        const boxes = s.lines.reduce((acc, l) => acc + l.boxes, 0);
        const bottles = s.lines.reduce((acc, l) => acc + l.bottles, 0);
        return (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {boxes}b / {bottles}btl
          </span>
        );
      },
    },
    {
      key: "status",
      header: t('status'),
      render: (s: Sale) => (
        <StatusChip label={s.status} tone={statusTone(s.status)} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (s: Sale) => {
        const items: Array<
          | {
              label: string;
              icon: typeof Eye;
              onSelect: () => void;
              disabled?: boolean;
              danger?: boolean;
            }
          | { divider: true }
        > = [
          {
            label: t('viewSale'),
            icon: Eye,
            onSelect: () => navigate(`/sales/${s.id}`),
          },
        ];
        if (isOwner) {
          items.push({
            label: t('edit'),
            icon: Copy,
            onSelect: () => openEdit(s),
            disabled: s.status === "VOIDED",
          });
        }
        items.push({
          label: t('duplicateSale'),
          icon: Copy,
          onSelect: () => openDuplicate(s),
        });
        if (isOwner) {
          items.push({ divider: true as const });
          items.push({
            label: t('void'),
            icon: Trash2,
            danger: true,
            onSelect: () => setVoidTarget(s),
            disabled: s.status === "VOIDED",
          });
        }
        return <ActionMenu items={items} />;
      },
    },
  ];

  const filterBar = (
    <div className="flex flex-col gap-3">
      {/* Date quick picks */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t('dateLabel')}</span>
        <button
          type="button"
          onClick={() => handleDateQuick(todayIso(), todayIso())}
          className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${dateFrom === todayIso() && dateTo === todayIso() ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
        >
          {t('today')}
        </button>
        <button
          type="button"
          onClick={() => handleDateQuick(weekStartIso(), todayIso())}
          className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${dateFrom === weekStartIso() ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
        >
          {t('thisWeek')}
        </button>
        <button
          type="button"
          onClick={() => handleDateQuick(monthStartIso(), todayIso())}
          className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${dateFrom === monthStartIso() ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
        >
          {t('thisMonth')}
        </button>
        <EthiopianDateInput
          value={dateFrom}
          onChange={(v) => { setDateFrom(v); setParam("dateFrom", v || undefined); }}
        />
        <span className="text-xs text-muted-foreground">—</span>
        <EthiopianDateInput
          value={dateTo}
          onChange={(v) => { setDateTo(v); setParam("dateTo", v || undefined); }}
        />
      </div>

      {/* Customer + payment account */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterCustomerId}
          onChange={(e) => {
            setFilterCustomerId(e.target.value);
            setParam("customerId", e.target.value || undefined);
          }}
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">{t('allCustomers')}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterPaymentAccountId}
          onChange={(e) => {
            setFilterPaymentAccountId(e.target.value);
            setParam("paymentAccountId", e.target.value || undefined);
          }}
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">{t('allAccounts')}</option>
          {paymentAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('statusLabel')}
        </span>
        {(["CONFIRMED", "OPEN", "VOIDED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              filterStatuses.includes(s)
                ? s === "CONFIRMED"
                  ? "border-success bg-success/10 text-success"
                  : s === "OPEN"
                    ? "border-warning bg-warning/10 text-warning"
                    : "border-border bg-muted text-muted-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Has credit */}
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={hasCredit}
          onChange={(e) => {
            setHasCredit(e.target.checked);
            setParam("hasCredit", e.target.checked ? "true" : undefined);
          }}
          className="rounded border-border"
        />
        {t('hasOutstandingCredit')}
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('recordManageSales')}
        description={t('recordManageSales')}
        breadcrumb={[t('shop'), t('sales')]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              title={t('exportCsv') as string}
            >
              <Download className="h-4 w-4" />
              {t('exportCsv')}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              title={t('newSaleShortcut') as string}
            >
              <Plus className="h-4 w-4" />
              {t('newSale')}
            </button>
          </div>
        }
      />

      {/* Desktop: DataTable */}
      <div className="hidden md:block">
        {loading && sales.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={sales}
            searchPlaceholder={t('searchSales') as string}
            search={search}
            onSearchChange={handleSearchChange}
            filterBar={filterBar}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onRowClick={(s) => navigate(`/sales/${s.id}`)}
            empty={
              loading ? (
                t('loading')
              ) : total === 0 && activeFilterCount === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">{t('noSalesYet')}</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    {t('recordFirstSale')}
                  </button>
                </div>
              ) : (
                t('noSalesMatchFilters')
              )
            }
          />
        )}
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {/* Mobile filter bar — collapsed by default */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              aria-expanded={mobileFiltersOpen}
            >
              {t('filter')}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                  {activeFilterCount}
                </span>
              )}
              <span aria-hidden className="text-muted-foreground">
                {mobileFiltersOpen ? "▴" : "▾"}
              </span>
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-primary hover:underline"
              >
                {t('clearAll')}
              </button>
            )}
          </div>
          {mobileFiltersOpen && (
            <div className="border-t border-border px-3 py-3">{filterBar}</div>
          )}
        </div>

        {loading && sales.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {activeFilterCount > 0
                ? t('noSalesMatchFilters')
                : t('noSalesYet')}
            </p>
            {activeFilterCount === 0 && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('recordFirstSale')}
              </button>
            )}
          </div>
        ) : (
          <>
            {sales.map((s) => (
              <SaleCard
                key={s.id}
                sale={s}
                beveragesMap={beveragesMap}
                customersMap={customersMap}
                onView={(sale) => navigate(`/sales/${sale.id}`)}
                onEdit={openEdit}
                onVoid={setVoidTarget}
                onDuplicate={openDuplicate}
                canModify={isOwner}
              />
            ))}
            {/* Mobile pagination */}
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>
                {total === 0
                  ? t('noResults')
                  : `${t('showing')} ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} ${t('of')} ${total}`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  {t('prev')}
                </button>
                <button
                  type="button"
                  disabled={page * PAGE_SIZE >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      {!refLoading && (
        <SaleDrawer
          state={drawerState}
          onClose={closeDrawer}
          onSaved={handleSaved}
          customers={customers}
          beverages={beverages}
          priceTiers={priceTiers}
          paymentAccounts={paymentAccounts}
          defaultPriceTierId={defaultPriceTierId}
          onCustomerCreated={(c) =>
            setCustomers((prev) =>
              prev.some((x) => x.id === c.id)
                ? prev
                : [...prev, c].sort((a, b) => a.name.localeCompare(b.name)),
            )
          }
        />
      )}

      {/* Void dialog */}
      <VoidDialog
        sale={voidTarget}
        onConfirm={handleVoid}
        onCancel={() => setVoidTarget(null)}
        voiding={voiding}
      />
    </div>
  );
}
