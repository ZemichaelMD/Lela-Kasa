import {
  ArrowLeft,
  Banknote,
  Calendar,
  Eye,
  EyeOff,
  Info,
  Mail,
  Package,
  Pencil,
  Phone,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/data-table";
import { EmployeeDrawer } from "@/components/employee-drawer";
import { sdk, API_URL, tokenStore } from "@/lib/sdk";
import type { Employee, EmployeeDetail, Sale } from "@/sdk";
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

type TabId = "info" | "permissions" | "activity";

// ─── Permission helpers ────────────────────────────────────────────────────────

type LocalizedString = string | { en: string; am: string };

interface PermissionItem {
  slug: string;
  label: LocalizedString;
  description: LocalizedString;
  granted: boolean;
}

interface PermissionGroup {
  group: LocalizedString;
  permissions: PermissionItem[];
}

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const envelope = await res.json();
  return envelope?.data ?? envelope;
}

// ─── Info Tab ──────────────────────────────────────────────────────────────────

function InfoTab({ employee }: { employee: EmployeeDetail }) {
  const { t } = useI18n();
  const inputClass = "rounded-lg bg-muted/30 px-3 py-2 text-sm border border-border";

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${employee.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {employee.isActive ? <UserCheck className="h-6 w-6" /> : <UserX className="h-6 w-6" />}
        </div>
        <div>
          <p className="text-lg font-semibold">{employee.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <StatusChip
              label={employee.role}
              tone={employee.role === "OWNER" ? "info" : "neutral"}
            />
            <StatusChip
              label={employee.isActive ? t("active") : t("inactive")}
              tone={employee.isActive ? "success" : "neutral"}
            />
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("email")}</label>
          <div className={`${inputClass} flex items-center gap-2`}>
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("phone")}</label>
          <div className={`${inputClass} flex items-center gap-2`}>
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{employee.phone ?? "·"}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("emailVerified")}</label>
          <StatusChip
            label={employee.emailVerified ? t("emailVerified") : t("emailUnverified")}
            tone={employee.emailVerified ? "success" : "warning"}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("username")}</label>
          <div className={`${inputClass}`}>
            <span>{employee.username ?? <span className="text-muted-foreground italic">{t("notSet")}</span>}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("employeeSince")}</label>
          <div className={`${inputClass} flex items-center gap-2`}>
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <FormattedDate iso={employee.createdAt} />
          </div>
        </div>
      </div>

      {/* Password reset */}
      <PasswordResetSection employeeId={employee.id} />
    </div>
  );
}

// ─── Password Reset Section ─────────────────────────────────────────────────────

function PasswordResetSection({ employeeId }: { employeeId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const classes = [/[a-z]/.test(password), /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    if (classes < 3) { toast.error("Use at least 3 of: lowercase, uppercase, numbers, symbols"); return; }

    setSaving(true);
    try {
      await sdk.employees.resetPassword(employeeId, password);
      toast.success("Password reset successfully. Employee sessions have been revoked.");
      setOpen(false);
      setPassword("");
      setConfirm("");
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  const ic = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Reset Password</p>
          <p className="text-xs text-muted-foreground mt-0.5">Set a new password for this employee. Their active sessions will be revoked.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {open ? "Cancel" : "Reset Password"}
        </button>
      </div>
      {open && (
        <form onSubmit={handleReset} className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">New Password</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                required
                className={ic}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Confirm Password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              required
              className={ic}
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
            >
              {saving ? "Resetting..." : "Set New Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Permissions Tab ───────────────────────────────────────────────────────────

function PermissionsTab({ employeeId }: { employeeId: string }) {
  const { t, lang } = useI18n();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/v1/permissions/employees/${employeeId}`)
      .then((data) => {
        const allPerms: PermissionItem[] = [];
        for (const g of data) allPerms.push(...g.permissions);
        const map: Record<string, boolean> = {};
        for (const p of allPerms) map[p.slug] = p.granted;
        setOriginal(map);
        setGroups(data);
      })
      .catch(() => toast.error(t("failedLoadPermissions")))
      .finally(() => setLoading(false));
  }, [employeeId, t]);

  function toggle(slug: string, current: boolean) {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        permissions: g.permissions.map((p) =>
          p.slug === slug ? { ...p, granted: !current } : p,
        ),
      })),
    );
    setDirty(true);
  }

  function toggleGroup(groupName: string, grant: boolean) {
    setGroups((prev) =>
      prev.map((g) => {
        const gn = typeof g.group === 'string' ? g.group : g.group.en;
        return gn === groupName
          ? { ...g, permissions: g.permissions.map((p) => ({ ...p, granted: grant })) }
          : g;
      }),
    );
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const updates: Array<{ slug: string; granted: boolean }> = [];
    for (const g of groups) {
      for (const p of g.permissions) {
        if (p.granted !== original[p.slug]) {
          updates.push({ slug: p.slug, granted: p.granted });
        }
      }
    }
    if (updates.length === 0) { setDirty(false); setSaving(false); return; }
    try {
      const token = tokenStore.getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/permissions/employees/${employeeId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      if (!res.ok) throw new Error();
      setGroups(data);
      const allPerms: PermissionItem[] = [];
      for (const g of data) allPerms.push(...g.permissions);
      const map: Record<string, boolean> = {};
      for (const p of allPerms) map[p.slug] = p.granted;
      setOriginal(map);
      setDirty(false);
      toast.success(t("permissionsSaved"));
    } catch {
      toast.error(t("failedSavePermissions"));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        permissions: g.permissions.map((p) => ({ ...p, granted: original[p.slug] ?? p.granted })),
      })),
    );
    setDirty(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("failedLoadPermissions")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {dirty && (
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 rounded-lg border border-border bg-background/95 backdrop-blur p-3 -mx-1">
          <p className="text-sm text-muted-foreground mr-auto">{t("unsavedChanges")}</p>
          <button type="button" onClick={handleCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
            {t("cancel")}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </div>
      )}

      {groups.map((group) => {
        const groupName = typeof group.group === 'string' ? group.group : group.group[lang];
        const allGranted = group.permissions.every((p) => p.granted);
        return (
          <Card key={groupName} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {groupName}
              </h3>
              <button type="button" onClick={() => toggleGroup(groupName, !allGranted)}
                className="text-xs text-primary hover:underline">
                {allGranted ? t("revokeAll") : t("grantAll")}
              </button>
            </div>
            <div className="space-y-1">
              {group.permissions.map((perm) => (
                <div key={perm.slug} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{typeof perm.label === 'string' ? perm.label : perm.label[lang]}</p>
                    <p className="text-xs text-muted-foreground">{typeof perm.description === 'string' ? perm.description : perm.description[lang]}</p>
                  </div>
                  <button type="button" onClick={() => toggle(perm.slug, perm.granted)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${perm.granted ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${perm.granted ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {groups.length > 0 && !dirty && (
        <div className="flex justify-end pt-2">
          <p className="text-xs text-muted-foreground">{t("permissionsDescription")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab ──────────────────────────────────────────────────────────────

function ActivityTab({ employeeId }: { employeeId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showVoided, setShowVoided] = useState(false);
  const [search, setSearch] = useState("");

  const pageSize = 20;

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sdk.sales.list({
        page,
        pageSize,
        createdById: employeeId,
        dateFrom,
        dateTo,
        status: showVoided ? undefined : 'CONFIRMED,OPEN',
        search: search || undefined,
      });
      setSales(result.data);
      setTotal(result.total);
    } catch {
      toast.error(t("failedLoadSales"));
    } finally {
      setLoading(false);
    }
  }, [employeeId, page, dateFrom, dateTo, showVoided, search, t]);

  useEffect(() => { void fetchSales(); }, [fetchSales]);

  const totalAmountCents = useMemo(
    () => sales.reduce((sum, s) => sum + s.subtotalCents, 0),
    [sales],
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Summary widgets */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("totalSales")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("totalSalesAmount")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoneyCents(totalAmountCents)}</p>
            </div>
            <div className="rounded-lg bg-success/15 p-2">
              <Banknote className="h-4 w-4 text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t("from")}</label>
          <EthiopianDateInput
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t("to")}</label>
          <EthiopianDateInput
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1); }}
          />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("search") as string}
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40 w-40"
        />
        <button
          type="button"
          onClick={() => setShowVoided((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showVoided
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          {showVoided ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {t("showVoided")}
        </button>
      </div>

      {/* Sales list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : sales.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("noActivity")}</p>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => {
            const isVoided = sale.status === "VOIDED";
            return (
              <div
                key={sale.id}
                onClick={() => navigate(`/sales/${sale.id}`)}
                className={`cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 hover:border-primary/40 ${isVoided ? "bg-muted/20 opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`rounded-lg p-2 mt-0.5 ${isVoided ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {sale.customer?.name ?? t("walkIn")}
                        </p>
                        {isVoided && <StatusChip label={t("voided")} tone="neutral" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <FormattedDate iso={sale.saleDate} />
                      </p>
                      {sale.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{sale.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${isVoided ? "text-muted-foreground line-through" : ""}`}>
                      {formatMoneyCents(sale.subtotalCents)}
                    </p>
                    {sale.paidCents > 0 && (
                      <p className="text-xs text-success tabular-nums">
                        {t("paid")}: {formatMoneyCents(sale.paidCents)}
                      </p>
                    )}
                    {sale.creditDeltaCents > 0 && (
                      <p className="text-xs text-destructive tabular-nums">
                        {t("credit")}: {formatMoneyCents(sale.creditDeltaCents)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {t("showing")} {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} {t("of")} {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
            >
              {t("prev")}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchEmployee = useCallback(() => {
    if (!id) return;
    setLoading(true);
    sdk.employees.findOne(id)
      .then(setEmployee)
      .catch(() => toast.error(t("failedLoadEmployees")))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  function handleSaved(saved: Employee) {
    setDrawerOpen(false);
    setEmployee(saved as EmployeeDetail);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/employees")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToEmployees")}
        </button>
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {t("employeeNotFound")}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.name}
        description={employee.email}
        breadcrumb={[t("shop"), t("manageEmployees"), employee.name]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/employees")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToEmployees")}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="h-4 w-4" />
              {t("editEmployee")}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-2 pt-2">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "info", label: t("info"), icon: Info },
              { id: "permissions", label: t("permissions"), icon: ShieldCheck },
              { id: "activity", label: t("activity"), icon: Package },
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
          {activeTab === "info" && <InfoTab employee={employee} />}
          {activeTab === "permissions" && <PermissionsTab employeeId={employee.id} />}
          {activeTab === "activity" && <ActivityTab employeeId={employee.id} />}
        </div>
      </Card>

      <EmployeeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={employee}
        onSaved={handleSaved}
      />
    </div>
  );
}
