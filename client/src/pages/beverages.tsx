import {
  Check,
  ClipboardList,
  Minus,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PermissionGate } from "@/components/permission-gate";
import { sdk } from "@/lib/sdk";
import type { Beverage, StockMovement } from "@/sdk";
import { ApiError } from "@/sdk";
import { useI18n } from "@/lib/i18n";
import { EthiopianDateInput, FormattedDate } from "@/ui";
import { stockLabel, emptyStockLabel } from "@/lib/stock-utils";

// ─── Beverage Drawer ──────────────────────────────────────────────────────────

interface BevDrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Beverage | null;
  onSaved: (b: Beverage) => void;
}

interface BeverageEntry {
  key: string;
  name: string;
  brand: string;
  sizeMl: string;
  bottlesPerBox: string;
}

function newEntry(): BeverageEntry {
  return { key: Math.random().toString(36).slice(2, 8), name: "", brand: "", sizeMl: "", bottlesPerBox: "24" };
}

function BeverageDrawer({ open, onClose, editing, onSaved }: BevDrawerProps) {
  const { t } = useI18n();
  const isAddMode = !editing;

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [sizeMl, setSizeMl] = useState("");
  const [bottlesPerBox, setBottlesPerBox] = useState("24");

  const [entries, setEntries] = useState<BeverageEntry[]>([newEntry()]);

  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setBrand(editing.brand ?? "");
        setSizeMl(editing.sizeMl != null ? String(editing.sizeMl) : "");
        setBottlesPerBox(String(editing.bottlesPerBox ?? 24));
      } else {
        setEntries([newEntry()]);
      }
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, editing]);

  function updateEntry(key: string, field: keyof BeverageEntry, value: string) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)));
  }

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()]);
  }

  function removeEntry(key: string) {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.key !== key);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        if (!name.trim()) return;
        const dto = {
          name: name.trim(),
          brand: brand.trim() || undefined,
          sizeMl: sizeMl ? Number(sizeMl) : undefined,
          bottlesPerBox: Number(bottlesPerBox) || 1,
        };
        const saved = await sdk.beverages.update(editing.id, dto);
        toast.success(t("beverageUpdated"));
        onSaved(saved);
      } else {
        const valid = entries.filter((e) => e.name.trim());
        if (valid.length === 0) return;
        const dtos = valid.map((e) => ({
          name: e.name.trim(),
          brand: e.brand.trim() || undefined,
          sizeMl: e.sizeMl ? Number(e.sizeMl) : undefined,
          bottlesPerBox: Number(e.bottlesPerBox) || 1,
        }));
        const created = await sdk.beverages.createMany(dtos);
        toast.success(`${created.length} ${created.length === 1 ? "beverage" : "beverages"} ${t("beverageCreated").toLowerCase()}`);
        if (created.length > 0) onSaved(created[0]);
        onClose();
      }
    } catch {
      toast.error(t("failedSaveBeverage"));
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
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? t("editBeverage") : t("newBeverage")}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {editing ? t("editBeverage") : t("newBeverage")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          {isAddMode ? (
            <>
              <p className="text-xs text-muted-foreground">
                Fill in one or more beverages to add them all at once.
              </p>
              <div className="space-y-4">
                {entries.map((entry, i) => (
                  <div key={entry.key} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                      {entries.length > 1 && (
                        <button type="button" onClick={() => removeEntry(entry.key)} className="rounded p-0.5 text-muted-foreground hover:text-destructive">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">{t("nameWithAsterisk")}</label>
                      <input
                        ref={i === 0 ? nameRef : undefined}
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.key, "name", e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Coca Cola"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">{t("brand")}</label>
                      <input value={entry.brand} onChange={(e) => updateEntry(entry.key, "brand", e.target.value)} className={inputClass} placeholder="e.g. Coca-Cola Company" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">{t("sizeMl")}</label>
                        <input value={entry.sizeMl} onChange={(e) => updateEntry(entry.key, "sizeMl", e.target.value)} type="number" min={0} className={inputClass} placeholder="500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">{t("bottlesPerBoxLabel")} *</label>
                        <input value={entry.bottlesPerBox} onChange={(e) => updateEntry(entry.key, "bottlesPerBox", e.target.value)} type="number" min={1} className={inputClass} placeholder="24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addEntry} className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add another beverage
              </button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("nameWithAsterisk")}</label>
                <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="e.g. Coca Cola" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("brand")}</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="e.g. Coca-Cola Company" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("sizeMl")}</label>
                  <input value={sizeMl} onChange={(e) => setSizeMl(e.target.value)} type="number" min={0} className={inputClass} placeholder="500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("bottlesPerBoxLabel")} *</label>
                  <input value={bottlesPerBox} onChange={(e) => setBottlesPerBox(e.target.value)} type="number" min={1} required className={inputClass} placeholder="24" />
                </div>
              </div>
            </>
          )}
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
              {t("cancel")}
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
              {saving ? t("saving") : editing ? t("saveChanges") : t("create")}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// ─── Stock (Inventory) Drawer ─────────────────────────────────────────────────

type StockTab = "adjust" | "swap" | "history";

interface StockDrawerProps {
  beverage: Beverage | null;
  onClose: () => void;
  onAdjusted: (b: Beverage) => void;
}

function movFullLabel(m: StockMovement, beverage: Beverage | null, t: (k: any) => string) {
  const abs = Math.abs(m.bottlesDelta);
  const bx = beverage ? Math.floor(abs / beverage.bottlesPerBox) : 0;
  const bt = beverage ? abs % beverage.bottlesPerBox : abs;
  const parts: string[] = [];
  if (bx > 0) parts.push(`${bx} ${t("boxes").toLowerCase()}`);
  if (bt > 0 || parts.length === 0) parts.push(`${bt} ${t("bottles").toLowerCase()}`);
  return `${m.bottlesDelta > 0 ? "+" : "\u2212"}${parts.join(" + ")}`;
}

function movLabel(m: StockMovement, beverage: Beverage | null, t: (k: any) => string) {
  const parts: string[] = [];
  if (m.bottlesDelta && m.bottlesDelta !== 0) {
    parts.push(`${movFullLabel(m, beverage, t)} ${t("fullStock").toLowerCase()}`);
  }
  if (m.emptyBoxesDelta || m.emptyBottlesDelta) {
    const ebd = m.emptyBoxesDelta ?? 0;
    const ebtd = m.emptyBottlesDelta ?? 0;
    const sub: string[] = [];
    if (ebd !== 0) sub.push(`${Math.abs(ebd)} ${t("boxes").toLowerCase()}`);
    if (ebtd !== 0 || sub.length === 0) sub.push(`${Math.abs(ebtd)} ${t("bottles").toLowerCase()}`);
    const isPositive = (m.emptyBoxesDelta ?? 0) + (m.emptyBottlesDelta ?? 0) > 0;
    parts.push(`${isPositive ? "+" : "\u2212"}${sub.join(" + ")} ${t("emptyStock").toLowerCase()}`);
  }
  return parts.join("  \u00B7  ");
}

function StockDrawer({ beverage, onClose, onAdjusted }: StockDrawerProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<StockTab>("adjust");

  // Adjust form
  const [fullBoxes, setFullBoxes] = useState("");
  const [fullBottles, setFullBottles] = useState("");
  const [isRemoveFull, setIsRemoveFull] = useState(false);
  const [emptyBoxes, setEmptyBoxes] = useState("");
  const [emptyBottles, setEmptyBottles] = useState("");
  const [reason, setReason] = useState<string>("PURCHASE");
  const [notes, setNotes] = useState("");

  // Swap form
  const [swapBoxes, setSwapBoxes] = useState("");
  const [swapBottles, setSwapBottles] = useState("");

  const [saving, setSaving] = useState(false);

  // History
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movLoading, setMovLoading] = useState(false);
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [histReason, setHistReason] = useState("");

  const open = beverage !== null;

  useEffect(() => {
    if (open) {
      setTab("adjust");
      setFullBoxes("");
      setFullBottles("");
      setIsRemoveFull(false);
      setEmptyBoxes("");
      setEmptyBottles("");
      setReason("PURCHASE");
      setNotes("");
      setSwapBoxes("");
      setSwapBottles("");
      setMovements([]);
      setHistDateFrom("");
      setHistDateTo("");
      setHistReason("");
    }
  }, [open, beverage?.id]);

  useEffect(() => {
    if (tab === "history" && beverage) {
      setMovLoading(true);
      sdk.beverages
        .getMovements(beverage.id)
        .then(setMovements)
        .catch(() => toast.error(t("failedLoadHistory")))
        .finally(() => setMovLoading(false));
    }
  }, [tab, beverage, t]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!beverage) return;
    const fb = parseInt(fullBoxes, 10) || 0;
    const fbt = parseInt(fullBottles, 10) || 0;
    const eb = parseInt(emptyBoxes, 10) || 0;
    const ebt = parseInt(emptyBottles, 10) || 0;
    const fullDelta = (isRemoveFull ? -1 : 1) * (fb * beverage.bottlesPerBox + fbt);

    if (fullDelta === 0 && eb === 0 && ebt === 0) {
      toast.error(t("enterAtLeastOneFullOrEmpty"));
      return;
    }

    setSaving(true);
    try {
      const updated = await sdk.beverages.adjustInventory(beverage.id, {
        fullBottlesDelta: fullDelta !== 0 ? fullDelta : undefined,
        emptyBoxesDelta: eb > 0 ? eb : undefined,
        emptyBottlesDelta: ebt > 0 ? ebt : undefined,
        reason,
        notes: notes.trim() || undefined,
      });
      toast.success(t("inventoryAdjusted"));
      onAdjusted(updated);
      setFullBoxes("");
      setFullBottles("");
      setEmptyBoxes("");
      setEmptyBottles("");
      setNotes("");
      setIsRemoveFull(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("inventoryAdjustFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault();
    if (!beverage) return;
    const eb = parseInt(swapBoxes, 10) || 0;
    const ebt = parseInt(swapBottles, 10) || 0;
    if (eb === 0 && ebt === 0) {
      toast.error(t("enterAtLeastOneFullOrEmpty"));
      return;
    }
    if (eb > beverage.emptyBoxes || ebt > beverage.emptyBottles) {
      toast.error(t("notEnoughEmpties"));
      return;
    }
    setSaving(true);
    try {
      const updated = await sdk.beverages.swap(beverage.id, {
        emptyBoxes: eb,
        emptyBottles: ebt,
      });
      toast.success(t("swapCompleted"));
      onAdjusted(updated);
      setSwapBoxes("");
      setSwapBottles("");
    } catch {
      toast.error(t("swapFailed"));
    } finally {
      setSaving(false);
    }
  }

  const filteredMovements = movements.filter((m) => {
    if (histReason && m.reason !== histReason) return false;
    if (histDateFrom && m.createdAt < histDateFrom) return false;
    if (histDateTo && m.createdAt > histDateTo + "T23:59:59") return false;
    return true;
  });

  const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const REASONS = [
    { value: "PURCHASE", label: t("purchase") },
    { value: "ADJUSTMENT", label: t("stockAdjustment") },
    { value: "RETURN", label: t("return") },
  ];

  const ALL_REASONS = [...REASONS, { value: "SWAP", label: t("swap") }];

  const fullBoxDelta = (parseInt(fullBoxes, 10) || 0) * (beverage?.bottlesPerBox ?? 0);
  const fullBtlDelta = parseInt(fullBottles, 10) || 0;
  const fullComputed = (isRemoveFull ? -1 : 1) * (fullBoxDelta + fullBtlDelta);

  const swapBoxesNum = parseInt(swapBoxes, 10) || 0;
  const swapBottlesNum = parseInt(swapBottles, 10) || 0;
  const swapReceiving = swapBoxesNum * (beverage?.bottlesPerBox ?? 0) + swapBottlesNum;

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
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{beverage?.name}</h2>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{t("fullStock")}: {stockLabel(beverage, t)}</span>
              <span>{t("emptyStock")}: {emptyStockLabel(beverage, t)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border bg-muted/30 px-4 pt-2">
          {(["adjust", "swap", "history"] as const).map((t_tab) => (
            <button
              key={t_tab}
              type="button"
              onClick={() => setTab(t_tab)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t_tab ? "border border-b-0 border-border bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t_tab === "adjust" ? t("addAdjust") : t_tab === "swap" ? t("swap") : t("history")}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "adjust" && (
            <form onSubmit={handleAdjust} className="space-y-5 px-5 py-5">
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-2 text-sm font-medium">{t("fullStockAdjustment")}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("boxes")}</label>
                    <input value={fullBoxes} onChange={(e) => setFullBoxes(e.target.value)} type="number" min={0} className={inputClass} placeholder="0" />
                    {beverage && <p className="text-xs text-muted-foreground">× {beverage.bottlesPerBox} {t("bottles").toLowerCase()} {t("each")}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("extraBottles")}</label>
                    <input value={fullBottles} onChange={(e) => setFullBottles(e.target.value)} type="number" min={0} className={inputClass} placeholder="0" />
                  </div>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={isRemoveFull} onChange={(e) => setIsRemoveFull(e.target.checked)} className="rounded border-border" />
                  {t("removeFull")}
                </label>
                {fullComputed !== 0 && (
                  <p className={`mt-2 text-sm font-medium ${fullComputed > 0 ? "text-success" : "text-destructive"}`}>
                    {fullComputed > 0 ? "+" : ""}{fullComputed} {t("bottles").toLowerCase()} {t("fullStock").toLowerCase()}
                  </p>
                )}
              </fieldset>

              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-2 text-sm font-medium">{t("emptyStockAdjustment")}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("emptyBoxes")}</label>
                    <input value={emptyBoxes} onChange={(e) => setEmptyBoxes(e.target.value)} type="number" min={0} className={inputClass} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("emptyBottles")}</label>
                    <input value={emptyBottles} onChange={(e) => setEmptyBottles(e.target.value)} type="number" min={0} className={inputClass} placeholder="0" />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("reason")}</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
                  {REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("note")}</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder={t("optional") as string} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("cancel")}</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
                  {saving ? t("saving") : t("apply")}
                </button>
              </div>
            </form>
          )}

          {tab === "swap" && (
            <form onSubmit={handleSwap} className="space-y-4 px-5 py-5">
              <p className="text-xs text-muted-foreground">{t("swapDescription")}</p>
              {beverage && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  {t("emptyStock")}: {emptyStockLabel(beverage, t)}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("emptyBoxesToSwap")}</label>
                  <input value={swapBoxes} onChange={(e) => setSwapBoxes(e.target.value)} type="number" min={0} className={inputClass} placeholder="0" />
                  {beverage && <p className="text-xs text-muted-foreground">× {beverage.bottlesPerBox} {t("bottles").toLowerCase()} {t("each")}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("emptyBottlesToSwap")}</label>
                  <input value={swapBottles} onChange={(e) => setSwapBottles(e.target.value)} type="number" min={0} className={inputClass} placeholder="0" />
                </div>
              </div>

              {swapReceiving > 0 && (
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">{t("fullBottlesReceived")}</p>
                  <p className="text-lg font-semibold text-success">+{swapReceiving} {t("bottles").toLowerCase()}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("cancel")}</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
                  {saving ? t("saving") : t("swap")}
                </button>
              </div>
            </form>
          )}

          {tab === "history" && (
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("from")}</label>
                  <EthiopianDateInput value={histDateFrom} onChange={setHistDateFrom} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("to")}</label>
                  <EthiopianDateInput value={histDateTo} onChange={setHistDateTo} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("reason")}</label>
                <select value={histReason} onChange={(e) => setHistReason(e.target.value)} className={inputClass}>
                  <option value="">{t("allReasons")}</option>
                  {ALL_REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>

              {movLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
              ) : filteredMovements.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("noMovements")}</p>
              ) : (
                <div className="space-y-2">
                  {filteredMovements.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border bg-background px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {ALL_REASONS.find((r) => r.value === m.reason)?.label ?? m.reason}
                        </span>
                        <span className="text-xs text-muted-foreground"><FormattedDate iso={m.createdAt} /></span>
                      </div>
                      <p className="text-xs font-medium tabular-nums">{movLabel(m, beverage, t)}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

function DeleteDialog({
  beverage,
  onConfirm,
  onCancel,
  deleting,
}: {
  beverage: Beverage | null;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const { t } = useI18n();
  if (!beverage) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t("deleteBeverageQuestion")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("permanentlyRemoveBeverage")} <strong>{beverage.name}</strong>.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("cancel")}</button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90">
            {deleting ? t("deleting") : t("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function BeveragesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("q") ?? "";
  const activeOnly = searchParams.get("active") !== "false";

  const [search, setSearch] = useState(searchParam);
  const [page, setPage] = useState(1);
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Beverage | null>(null);
  const [stockTarget, setStockTarget] = useState<Beverage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Beverage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useI18n();

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

  function toggleActive() {
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (activeOnly) next.set("active", "false");
      else next.delete("active");
      return next;
    });
  }

  const fetchBeverages = useCallback(async () => {
    setLoading(true);
    try {
      const isActive = searchParams.get("active") === "false" ? undefined : true;
      const result = await sdk.beverages.list({
        page,
        pageSize: PAGE_SIZE,
        search: searchParams.get("q") ?? undefined,
        isActive,
      });
      setBeverages(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load beverages");
    } finally {
      setLoading(false);
    }
  }, [page, searchParams]);

  useEffect(() => {
    void fetchBeverages();
  }, [fetchBeverages]);

  function handleSaved(saved: Beverage) {
    setDrawerOpen(false);
    void fetchBeverages();
  }

  function handleAdjusted(updated: Beverage) {
    setStockTarget(null);
    setBeverages((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sdk.beverages.remove(deleteTarget.id);
      toast.success("Beverage deleted");
      setDeleteTarget(null);
      void fetchBeverages();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Cannot delete: beverage has associated records");
      } else {
        toast.error("Failed to delete beverage");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const activeFilterCount = (searchParams.get("q") ? 1 : 0) + (!activeOnly ? 1 : 0);

  const columns = [
    {
      key: "name",
      header: t("name"),
      render: (b: Beverage) => <span className="font-medium">{b.name}</span>,
    },
    {
      key: "brand",
      header: t("brand"),
      render: (b: Beverage) => <span className="text-muted-foreground">{b.brand ?? "\u00B7"}</span>,
    },
    {
      key: "bpb",
      header: t("bottlesPerBoxLabel"),
      render: (b: Beverage) => <span>{b.bottlesPerBox}</span>,
    },
    {
      key: "stock",
      header: t("fullStock"),
      render: (b: Beverage) => {
        const lowThreshold = b.bottlesPerBox * 2;
        const isLow = b.stockBottles <= lowThreshold;
        return (
          <span className={`flex items-center gap-1.5 ${isLow ? "text-warning" : ""}`}>
            {isLow && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            {stockLabel(b, t)}
          </span>
        );
      },
    },
    {
      key: "empty",
      header: t("emptyStock"),
      render: (b: Beverage) => <span className="text-muted-foreground">{emptyStockLabel(b, t)}</span>,
    },
    {
      key: "active",
      header: t("active"),
      render: (b: Beverage) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {b.isActive ? t("active") : t("inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (b: Beverage) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission="beverages:edit">
            <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(b); setDrawerOpen(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title={t("edit") as string}>
              <Pencil className="h-4 w-4" />
            </button>
          </PermissionGate>
          <PermissionGate permission="beverages:stock">
            <button type="button" onClick={(e) => { e.stopPropagation(); setStockTarget(b); }} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title={t("adjustInventory") as string}>
              <ClipboardList className="h-4 w-4" />
            </button>
          </PermissionGate>
          <PermissionGate permission="beverages:delete">
            <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); }} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title={t("delete") as string}>
              <Trash2 className="h-4 w-4" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("beverages")}
        description={t("manageBeveragesDesc")}
        breadcrumb={["Shop", t("beverages")]}
        actions={
          <PermissionGate permission="beverages:create">
            <button type="button" onClick={() => { setEditing(null); setDrawerOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              {t("newBeverage")}
            </button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        rows={beverages}
        searchPlaceholder={t("searchBeverages")}
        search={search}
        onSearchChange={handleSearchChange}
        filterBar={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={activeOnly} onChange={toggleActive} className="rounded border-border" />
              {t("activeOnly")}
            </label>
          </div>
        }
        activeFilterCount={activeFilterCount}
        onClearFilters={() => { setSearch(""); setSearchParams({}); setPage(1); }}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(b) => navigate(`/beverages/${b.id}`)}
        empty={loading ? t("loading") : t("noBeveragesFound")}
      />

      <BeverageDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} editing={editing} onSaved={handleSaved} />

      <StockDrawer beverage={stockTarget} onClose={() => setStockTarget(null)} onAdjusted={handleAdjusted} />

      <DeleteDialog beverage={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
    </div>
  );
}
