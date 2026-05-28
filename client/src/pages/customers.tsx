import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PermissionGate } from "@/components/permission-gate";
import { sdk } from "@/lib/sdk";
import type { Customer, PriceTier } from "@/sdk";
import { ApiError } from "@/sdk";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

// ─── Drawer ──────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Customer | null;
  onSaved: (c: Customer) => void;
}

function CustomerDrawer({ open, onClose, editing, onSaved }: DrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [username, setUsername] = useState("");
  const [portalPin, setPortalPin] = useState("");
  const [tierId, setTierId] = useState("");
  const [tierLocked, setTierLocked] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const pinReadOnly = editing?.passwordChangedAt != null;

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setPhone(editing?.phone ?? "");
      setEmail((editing as any)?.email ?? "");
      setNotes(editing?.notes ?? "");
      setUsername((editing as any)?.username ?? "");
      setPortalPin("");
      setTierId(editing?.priceTierId ?? "");
      setTierLocked(editing?.priceTierLocked ?? false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, editing]);

  useEffect(() => {
    sdk.priceTiers.list().then(setTiers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const dto: any = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        priceTierId: tierId || undefined,
        priceTierLocked: tierLocked,
      };

      if (username.trim()) dto.username = username.trim();
      if (portalPin.trim()) dto.pin = portalPin.trim();

      const saved = editing
        ? await sdk.customers.update(editing.id, dto)
        : await sdk.customers.create(dto);
      toast.success(editing ? t("customerUpdated") : t("customerCreated"));
      onSaved(saved);
    } catch {
      toast.error(t("failedSaveCustomer"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? t("editCustomer") : t("newCustomer")}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {editing ? t("editCustomer") : t("newCustomer")}
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
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder={t("fullName")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("phone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder={t("phonePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="customer@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("note")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder={t("optionalNotes")}
            />
          </div>

          {/* Price Tier */}
          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("priceTier")}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("defaultPriceTier")}</label>
              <select
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">· {t("none")} ·</option>
                {tiers.map((tier) => (
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
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
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
                placeholder={pinReadOnly ? "Customer has changed their PIN" : "Set a numeric PIN for customer login"}
              />
              {pinReadOnly && (
                <p className="text-xs text-muted-foreground">{t("pinReadOnlyHint")}</p>
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

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  customer: Customer | null;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteDialog({
  customer,
  onConfirm,
  onCancel,
  deleting,
}: DeleteDialogProps) {
  const { t } = useI18n();
  if (!customer) return null;
  const hasCredit = customer.creditBalanceCents > 0;
  const hasContainers =
    customer.outstandingBoxes > 0 || customer.outstandingBottles > 0;
  const hasWarning = hasCredit || hasContainers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t("deleteQuestion")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("permanentlyRemove")} <strong>{customer.name}</strong>.
        </p>
        {hasWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {hasCredit &&
                `${t("outstandingCredit")}: ${formatMoneyCents(customer.creditBalanceCents)}. `}
              {customer.outstandingBoxes > 0 &&
                `${customer.outstandingBoxes} ${t("boxes").toLowerCase()} ${t("none").toLowerCase()}. `}
              {customer.outstandingBottles > 0 &&
                `${customer.outstandingBottles} ${t("bottles").toLowerCase()} ${t("none").toLowerCase()}. `}
            </span>
          </div>
        )}
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

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("q") ?? "";
  const hasCreditParam = searchParams.get("hasCredit") === "true";

  const [search, setSearch] = useState(searchParam);
  const [hasCreditFilter, setHasCreditFilter] = useState(hasCreditParam);
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = useI18n().t;
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search → URL params
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

  function toggleHasCredit() {
    const next = !hasCreditFilter;
    setHasCreditFilter(next);
    setPage(1);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set("hasCredit", "true");
      else p.delete("hasCredit");
      return p;
    });
  }

  function clearFilters() {
    setSearch("");
    setHasCreditFilter(false);
    setPage(1);
    setSearchParams({});
  }

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sdk.customers.list({
        page,
        pageSize: PAGE_SIZE,
        search: searchParams.get("q") ?? undefined,
        hasCredit: searchParams.get("hasCredit") === "true" ? true : undefined,
      });
      setCustomers(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, searchParams]);

  // Heal drifted credit/container counters across the whole customer table
  // once when the page mounts, then load the (corrected) list.
  const didRecalcRef = useRef(false);
  useEffect(() => {
    void (async () => {
      if (!didRecalcRef.current) {
        didRecalcRef.current = true;
        try {
          await sdk.customers.recalculateAll();
        } catch {
          /* non-fatal · fall through to showing stored values */
        }
      }
      await fetchCustomers();
    })();
  }, [fetchCustomers]);

  function openCreate() {
    setEditingCustomer(null);
    setDrawerOpen(true);
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setDrawerOpen(true);
  }

  function handleSaved(saved: Customer) {
    setDrawerOpen(false);
    void fetchCustomers();
    // Optimistic update in the list if editing
    if (editingCustomer) {
      setCustomers((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sdk.customers.remove(deleteTarget.id);
      toast.success("Customer deleted");
      setDeleteTarget(null);
      void fetchCustomers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Cannot delete: customer has outstanding balance");
      } else {
        toast.error("Failed to delete customer");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const activeFilterCount =
    (searchParams.get("q") ? 1 : 0) + (hasCreditFilter ? 1 : 0);

  const columns = [
    {
      key: "name",
      header: t("name"),
      render: (c: Customer) => (
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
      ),
    },
    {
      key: "phone",
      header: t("phone"),
      render: (c: Customer) => (
        <span className="text-muted-foreground">{c.phone ?? "·"}</span>
      ),
    },
    {
      key: "credit",
      header: t("credit"),
      render: (c: Customer) => (
        <span
          className={
            c.creditBalanceCents > 0
              ? "font-medium text-destructive"
              : "text-muted-foreground"
          }
        >
          {formatMoneyCents(c.creditBalanceCents)}
        </span>
      ),
    },
    {
      key: "boxes",
      header: t("boxesOut"),
      render: (c: Customer) => <span>{c.outstandingBoxes}</span>,
    },
    {
      key: "bottles",
      header: t("bottlesOut"),
      render: (c: Customer) => <span>{c.outstandingBottles}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (c: Customer) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission="customers:edit">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(c);
              }}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title={t("edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </PermissionGate>
          <PermissionGate permission="customers:delete">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(c);
              }}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={t("delete")}
            >
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
        title={t("customers")}
        description={t("manageCustomersDesc")}
        breadcrumb={["Shop", t("customers")]}
        actions={
          <PermissionGate permission="customers:create">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t("newCustomer")}
            </button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        rows={customers}
        searchPlaceholder={t("searchCustomers")}
        search={search}
        onSearchChange={handleSearchChange}
        filterBar={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasCreditFilter}
                onChange={toggleHasCredit}
                className="rounded border-border"
              />
              {t("hasCreditBalance")}
            </label>
          </div>
        }
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        empty={loading ? t("loading") : t("noCustomersFound")}
      />

      <CustomerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editingCustomer}
        onSaved={handleSaved}
      />

      <DeleteDialog
        customer={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}
