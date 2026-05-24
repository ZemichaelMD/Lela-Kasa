import {
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { sdk } from "@/lib/sdk";
import type { Beverage, StockMovement } from "@/sdk";
import { ApiError } from "@/sdk";
import { useI18n } from "@/lib/i18n";
import { EthiopianDateInput, FormattedDate } from "@/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockLabel(beverage: Beverage, t: (k: any) => string): string {
  const boxes = Math.floor(beverage.stockBottles / beverage.bottlesPerBox);
  const bottles = beverage.stockBottles % beverage.bottlesPerBox;
  const parts: string[] = [];
  if (boxes > 0)
    parts.push(
      `${boxes} ${t(boxes === 1 ? "boxes" : "boxes")
        .slice(0, boxes === 1 ? -1 : undefined)
        .toLowerCase()}`,
    );
  if (bottles > 0 || parts.length === 0)
    parts.push(
      `${bottles} ${t(bottles === 1 ? "bottles" : "bottles")
        .slice(0, bottles === 1 ? -1 : undefined)
        .toLowerCase()}`,
    );
  return parts.join(" + ");
}

// ─── Beverage Drawer ──────────────────────────────────────────────────────────

interface BevDrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Beverage | null;
  onSaved: (b: Beverage) => void;
}

function BeverageDrawer({ open, onClose, editing, onSaved }: BevDrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [sizeMl, setSizeMl] = useState("");
  const [bottlesPerBox, setBottlesPerBox] = useState("24");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setBrand(editing?.brand ?? "");
      setSizeMl(editing?.sizeMl != null ? String(editing.sizeMl) : "");
      setBottlesPerBox(String(editing?.bottlesPerBox ?? 24));
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const dto = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        sizeMl: sizeMl ? Number(sizeMl) : undefined,
        bottlesPerBox: Number(bottlesPerBox) || 1,
      };
      const saved = editing
        ? await sdk.beverages.update(editing.id, dto)
        : await sdk.beverages.create(dto);
      toast.success(editing ? t("beverageUpdated") : t("beverageCreated"));
      onSaved(saved);
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
              className={inputClass}
              placeholder="e.g. Coca Cola"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("brand")}</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={inputClass}
              placeholder="e.g. Coca-Cola Company"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("sizeMl")}</label>
              <input
                value={sizeMl}
                onChange={(e) => setSizeMl(e.target.value)}
                type="number"
                min={0}
                className={inputClass}
                placeholder="500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t("bottlesPerBoxLabel")} *
              </label>
              <input
                value={bottlesPerBox}
                onChange={(e) => setBottlesPerBox(e.target.value)}
                type="number"
                min={1}
                required
                className={inputClass}
                placeholder="24"
              />
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
            >
              {saving ? t("saving") : editing ? t("saveChanges") : t("create")}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// ─── Stock Drawer ─────────────────────────────────────────────────────────────

type HistoryTab = 'add' | 'history';

interface StockDrawerProps {
  beverage: Beverage | null;
  onClose: () => void;
  onAdjusted: (b: Beverage) => void;
}

function StockDrawer({ beverage, onClose, onAdjusted }: StockDrawerProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<HistoryTab>("add");

  // Add Stock form
  const [boxes, setBoxes] = useState("");
  const [bottles, setBottles] = useState("");
  const [reason, setReason] = useState<string>("PURCHASE");
  const [notes, setNotes] = useState("");
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
      setTab("add");
      setBoxes("");
      setBottles("");
      setReason("PURCHASE");
      setNotes("");
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

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    if (!beverage) return;
    const bxNum = parseInt(boxes, 10) || 0;
    const btlNum = parseInt(bottles, 10) || 0;
    const delta = bxNum * beverage.bottlesPerBox + btlNum;
    if (delta === 0) {
      toast.error(t("enterAtLeastOne"));
      return;
    }
    setSaving(true);
    try {
      const updated = await sdk.beverages.adjustStock(beverage.id, {
        bottlesDelta: delta,
        reason,
        notes: notes.trim() || undefined,
      });
      toast.success(t("stockUpdated"));
      onAdjusted(updated);
      setBoxes("");
      setBottles("");
      setNotes("");
    } catch {
      toast.error(t("failedUpdateStock"));
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

  const bxNum = parseInt(boxes, 10) || 0;
  const btlNum = parseInt(bottles, 10) || 0;
  const computedDelta = beverage ? bxNum * beverage.bottlesPerBox + btlNum : 0;

  function movLabel(m: StockMovement): string {
    const abs = Math.abs(m.bottlesDelta);
    const bx = beverage ? Math.floor(abs / beverage.bottlesPerBox) : 0;
    const bt = beverage ? abs % beverage.bottlesPerBox : abs;
    const parts: string[] = [];
    if (bx > 0)
      parts.push(
        `${bx} ${t(bx === 1 ? "boxes" : "boxes")
          .slice(0, bx === 1 ? -1 : undefined)
          .toLowerCase()}`,
      );
    if (bt > 0 || parts.length === 0)
      parts.push(
        `${bt} ${t(bt === 1 ? "bottles" : "bottles")
          .slice(0, bt === 1 ? -1 : undefined)
          .toLowerCase()}`,
      );
    return `${m.bottlesDelta > 0 ? "+" : "−"}${parts.join(" + ")}`;
  }

  const REASONS = [
    { value: "PURCHASE", label: t("purchase") },
    { value: "ADJUSTMENT", label: t("stockAdjustment") },
    { value: "RETURN", label: t("return") },
  ];

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
        aria-label={t("stock")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {t("stockHeading")} {beverage?.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("current")}: {beverage ? stockLabel(beverage, t) : "…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border bg-muted/30 px-4 pt-2">
          {(["add", "history"] as const).map((t_tab) => (
            <button
              key={t_tab}
              type="button"
              onClick={() => setTab(t_tab)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t_tab
                  ? "border border-b-0 border-border bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t_tab === "add" ? t("addAdjust") : t("history")}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "add" && (
            <form onSubmit={handleAddStock} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("boxes")}</label>
                  <input
                    value={boxes}
                    onChange={(e) => setBoxes(e.target.value)}
                    type="number"
                    className={inputClass}
                    placeholder="0"
                  />
                  {beverage && (
                    <p className="text-xs text-muted-foreground">
                      × {beverage.bottlesPerBox} {t("bottles").toLowerCase()}{" "}
                      {t("each")}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {t("extraBottles")}
                  </label>
                  <input
                    value={bottles}
                    onChange={(e) => setBottles(e.target.value)}
                    type="number"
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              </div>

              {computedDelta !== 0 && (
                <p
                  className={`text-sm font-medium ${computedDelta > 0 ? "text-success" : "text-destructive"}`}
                >
                  Delta: {computedDelta > 0 ? "+" : ""}
                  {computedDelta} {t("bottles").toLowerCase()}{" "}
                  {t("total").toLowerCase()}
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("reason")}</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("note")}</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                  placeholder={t("optional")}
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
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
                >
                  {saving ? t("saving") : t("apply")}
                </button>
              </div>
            </form>
          )}

          {tab === "history" && (
            <div className="px-5 py-5 space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("from")}
                  </label>
                  <EthiopianDateInput value={histDateFrom} onChange={setHistDateFrom} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("to")}
                  </label>
                  <EthiopianDateInput value={histDateTo} onChange={setHistDateTo} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t("reason")}
                </label>
                <select
                  value={histReason}
                  onChange={(e) => setHistReason(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("allReasons")}</option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* List */}
              {movLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </p>
              ) : filteredMovements.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("noMovements")}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMovements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {REASONS.find((r) => r.value === m.reason)?.label ??
                            m.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <FormattedDate iso={m.createdAt} />
                          {m.notes && ` · ${m.notes}`}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${m.bottlesDelta > 0 ? "text-success" : "text-destructive"}`}
                      >
                        {movLabel(m)}
                      </span>
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
        <h3 className="text-base font-semibold">
          {t("deleteBeverageQuestion")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("permanentlyRemoveBeverage")} <strong>{beverage.name}</strong>.
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
            disabled={deleting}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90"
          >
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
      const isActive =
        searchParams.get("active") === "false" ? undefined : true;
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
    setBeverages((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    );
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

  const activeFilterCount =
    (searchParams.get("q") ? 1 : 0) + (!activeOnly ? 1 : 0);

  const columns = [
    {
      key: "name",
      header: t("name"),
      render: (b: Beverage) => <span className="font-medium">{b.name}</span>,
    },
    {
      key: "brand",
      header: t("brand"),
      render: (b: Beverage) => (
        <span className="text-muted-foreground">{b.brand ?? "—"}</span>
      ),
    },
    {
      key: "size",
      header: t("sizeMl"),
      render: (b: Beverage) => <span>{b.sizeMl ?? "—"}</span>,
    },
    {
      key: "bpb",
      header: t("bottlesPerBoxLabel"),
      render: (b: Beverage) => <span>{b.bottlesPerBox}</span>,
    },
    {
      key: "stock",
      header: t("stock"),
      render: (b: Beverage) => {
        const lowThreshold = b.bottlesPerBox * 2; // simple heuristic if no shop setting
        const isLow = b.stockBottles <= lowThreshold && b.stockBottles >= 0;
        return (
          <span
            className={`flex items-center gap-1.5 ${isLow ? "text-warning" : ""}`}
          >
            {isLow && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            {stockLabel(b, t)}
          </span>
        );
      },
    },
    {
      key: "active",
      header: t("active"),
      render: (b: Beverage) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
        >
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(b);
              setDrawerOpen(true);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title={t("edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStockTarget(b);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title={`${t("stock")} / ${t("history")}`}
          >
            <ClipboardList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(b);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title={t("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t("newBeverage")}
          </button>
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
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={toggleActive}
                className="rounded border-border"
              />
              {t("activeOnly")}
            </label>
          </div>
        }
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setSearch("");
          setSearchParams({});
          setPage(1);
        }}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(b) => navigate(`/beverages/${b.id}`)}
        empty={loading ? t("loading") : t("noBeveragesFound")}
      />

      <BeverageDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onSaved={handleSaved}
      />

      <StockDrawer
        beverage={stockTarget}
        onClose={() => setStockTarget(null)}
        onAdjusted={handleAdjusted}
      />

      <DeleteDialog
        beverage={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}
