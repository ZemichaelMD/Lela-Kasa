import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from "@/ui";
import { DataTable, StatusChip } from "@/components/data-table";
import { sdk } from "@/lib/sdk";
import { formatMoneyCents } from "@/utils/money";
import {
  BarChart3,
  CreditCard,
  Crown,
  DollarSign,
  Globe,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
const labelClass = "text-sm font-medium";

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </>
  );
}

function SendSmsModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !message.trim()) return;
    setSending(true);
    try {
      toast.success(`SMS sent to ${phone} (mock)`);
      onClose();
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl space-y-4"
      >
        <h3 className="text-lg font-semibold">Send SMS</h3>
        <div className="space-y-1.5">
          <label className={labelClass}>Phone Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            className={inputClass}
            placeholder="+251 9XX XXX XXX"
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            placeholder="Your message..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [smsOpen, setSmsOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    sdk.admin
      .getSubscriptionMetrics()
      .then(setMetrics)
      .catch(() => toast.error("Failed to load metrics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> MRR
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {metrics?.mrrFormatted ?? "0 ETB"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Crown className="h-3 w-3" /> Active
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {metrics?.activeSubscriptions ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Trial
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {metrics?.trialSubscriptions ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-3 w-3" /> Total Subs
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {metrics?.totalSubscriptions ?? 0}
          </p>
        </Card>
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSmsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <MessageSquare className="h-4 w-4" /> Send Subscription SMS
          </button>
        </div>
      </Card>
      {smsOpen && <SendSmsModal onClose={() => setSmsOpen(false)} />}
    </div>
  );
}

// ─── Tab: Plans ───────────────────────────────────────────────────────────────

const PLAN_FEATURES = [
  { key: "sales_tracking", label: "Sales Tracking" },
  { key: "container_tracking", label: "Container / Return Tracking" },
  { key: "customer_management", label: "Customer Management" },
  { key: "basic_reports", label: "Basic Reports" },
  { key: "advanced_reports", label: "Advanced Reports & CSV Export" },
  { key: "sms_reminders", label: "SMS Reminders" },
  { key: "bulk_sms", label: "Bulk SMS Campaigns" },
  { key: "api_access", label: "API Access" },
  { key: "priority_support", label: "Priority Support" },
  { key: "custom_branding", label: "Custom Branding" },
  { key: "dedicated_manager", label: "Dedicated Account Manager" },
  { key: "on_premise", label: "On-premise Deployment" },
] as const;

function parseFeatures(json: string): Record<string, boolean> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function PlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [monthlyBirr, setMonthlyBirr] = useState("0");
  const [yearlyBirr, setYearlyBirr] = useState("0");
  const [maxShops, setMaxShops] = useState("1");
  const [maxUsers, setMaxUsers] = useState("3");
  const [maxCust, setMaxCust] = useState("50");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [trialDays, setTrialDays] = useState("14");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      setPlans(await sdk.admin.listSubscriptionPlans());
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void fetch();
  }, []);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setDesc("");
    setMonthlyBirr("0");
    setYearlyBirr("0");
    setMaxShops("1");
    setMaxUsers("3");
    setMaxCust("50");
    setTrialDays("14");
    setIsDefault(false);
    const defaults: Record<string, boolean> = {};
    PLAN_FEATURES.forEach((f) => {
      defaults[f.key] = false;
    });
    defaults.sales_tracking = true;
    defaults.container_tracking = true;
    defaults.customer_management = true;
    setFeatures(defaults);
    setDrawerOpen(true);
  }

  function openEdit(p: any) {
    setEditTarget(p);
    setName(p.name);
    setDesc(p.description ?? "");
    setMonthlyBirr(String(p.monthlyPriceCents / 100));
    setYearlyBirr(String(p.yearlyPriceCents / 100));
    setMaxShops(String(p.maxShops));
    setMaxUsers(String(p.maxUsers));
    setMaxCust(String(p.maxCustomers));
    setTrialDays(String(p.trialDays ?? 14));
    setIsDefault(p.isDefault ?? false);
    setFeatures(parseFeatures(p.features));
    setDrawerOpen(true);
  }

  function toggleFeature(key: string) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const featuresJson = JSON.stringify(features);
      const data = {
        name: name.trim(),
        description: desc.trim() || undefined,
        monthlyPriceCents: Math.round(Number(monthlyBirr) * 100),
        yearlyPriceCents: Math.round(Number(yearlyBirr) * 100),
        maxShops: Number(maxShops),
        maxUsers: Number(maxUsers),
        maxCustomers: Number(maxCust),
        trialDays: Number(trialDays) || 14,
        isDefault,
        features: featuresJson,
      };
      if (editTarget) {
        await sdk.admin.updateSubscriptionPlan(editTarget.id, data);
        toast.success("Plan updated");
      } else {
        await sdk.admin.createSubscriptionPlan(data);
        toast.success("Plan created");
      }
      setDrawerOpen(false);
      void fetch();
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await sdk.admin.deleteSubscriptionPlan(id);
      toast.success("Plan deleted");
      void fetch();
    } catch {
      toast.error("Cannot delete plan with active subscriptions");
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const planFeatures = parseFeatures(p.features);
          const included = Object.entries(planFeatures).filter(
            ([, v]) => v,
          ).length;
          return (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-bold mb-2">
                {p.monthlyPriceCents === 0
                  ? "Free"
                  : `${(p.monthlyPriceCents / 100).toFixed(0)} ETB/mo`}
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground mb-3">
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {p.maxShops === -1 ? "∞" : p.maxShops} shops
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {p.maxUsers === -1 ? "∞" : p.maxUsers} users
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {p.maxCustomers === -1 ? "∞" : p.maxCustomers} customers
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5">
                  {included} features
                </span>
              </div>
              {included > 0 && (
                <div className="flex-1 space-y-1 text-xs mb-3">
                  {Object.entries(planFeatures)
                    .filter(([, v]) => v)
                    .slice(0, 5)
                    .map(([k]) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <span className="text-success">✓</span>{" "}
                        {PLAN_FEATURES.find((f) => f.key === k)?.label ?? k}
                      </div>
                    ))}
                  {included > 5 && (
                    <p className="text-muted-foreground">
                      +{included - 5} more
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-5 w-5 mr-2" /> Add Plan
        </button>
      </div>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? "Edit Plan" : "New Plan"}
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[80vh] overflow-y-auto px-1"
        >
          <div className="space-y-1.5">
            <label className={labelClass}>Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Monthly Price (ETB)</label>
              <input
                value={monthlyBirr}
                onChange={(e) => setMonthlyBirr(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Yearly Price (ETB)</label>
              <input
                value={yearlyBirr}
                onChange={(e) => setYearlyBirr(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Trial Period (days)</label>
            <input
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              type="number"
              min="0"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Max Shops</label>
              <input
                value={maxShops}
                onChange={(e) => setMaxShops(e.target.value)}
                type="number"
                className={inputClass}
                placeholder="-1 = unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Max Users</label>
              <input
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                type="number"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Max Customers</label>
              <input
                value={maxCust}
                onChange={(e) => setMaxCust(e.target.value)}
                type="number"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5 rounded-lg border border-border px-3.5">
            <div>
              <p className="text-sm font-medium">Default Plan</p>
              <p className="text-xs text-muted-foreground">
                New shops get this plan by default
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isDefault ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isDefault ? "left-4" : "left-0.5"}`}
              />
            </button>
          </div>
          <div className="space-y-1.5 border-t border-border pt-3">
            <label className={labelClass}>Features</label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which features this plan includes
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {PLAN_FEATURES.map((f) => (
                <label
                  key={f.key}
                  className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    checked={!!features[f.key]}
                    onChange={() => toggleFeature(f.key)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Tab: Payment Providers ───────────────────────────────────────────────────

function ProvidersTab() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("MANUAL");
  const [instructions, setInstructions] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      setProviders(await sdk.admin.listPaymentProviders());
    } catch {
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void fetch();
  }, []);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setKind("MANUAL");
    setInstructions("");
    setContactInfo("");
    setDrawerOpen(true);
  }
  function openEdit(p: any) {
    setEditTarget(p);
    setName(p.name);
    setKind(p.kind);
    setInstructions(p.instructions ?? "");
    setContactInfo(p.contactInfo ?? "");
    setDrawerOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        kind,
        instructions: instructions.trim() || undefined,
        contactInfo: contactInfo.trim() || undefined,
      };
      if (editTarget) {
        await sdk.admin.updatePaymentProvider(editTarget.id, data);
        toast.success("Provider updated");
      } else {
        await sdk.admin.createPaymentProvider(data);
        toast.success("Provider created");
      }
      setDrawerOpen(false);
      void fetch();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const KINDS = ["MANUAL", "BANK", "TELEBIRR", "CHAPA", "OTHER"];

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (p: any) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: "kind",
      header: "Type",
      render: (p: any) => <StatusChip label={p.kind} tone="info" />,
    },
    {
      key: "contact",
      header: "Contact",
      render: (p: any) => (
        <span className="text-xs text-muted-foreground">
          {p.contactInfo ?? "—"}
        </span>
      ),
    },
    {
      key: "active",
      header: "Active",
      render: (p: any) => (
        <StatusChip
          label={p.isActive ? "Active" : "Inactive"}
          tone={p.isActive ? "success" : "neutral"}
        />
      ),
    },
    {
      key: "txns",
      header: "Transactions",
      render: (p: any) => <span>{p._count?.paymentTransactions ?? 0}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (p: any) => (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => openEdit(p)}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={providers}
        empty={loading ? "Loading..." : "No providers"}
        toolbar={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Provider
          </button>
        }
      />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? "Edit Provider" : "New Provider"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. Bank Transfer - CBE"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Type</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={inputClass}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Payment Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder={`Bank: Commercial Bank of Ethiopia\nAccount: 1000001234567\nName: Lela Kasa Technologies PLC\n\nSend screenshot to our Telegram: @kasa_payments`}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>
              Contact Info{" "}
              <span className="text-xs text-muted-foreground">
                (Telegram / Email / Phone)
              </span>
            </label>
            <input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className={inputClass}
              placeholder="@kasa_payments"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Tab: Subscribers ─────────────────────────────────────────────────────────

function SubscribersTab() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markOpen, setMarkOpen] = useState(false);
  const [markTarget, setMarkTarget] = useState<any | null>(null);
  const [paidUntil, setPaidUntil] = useState("");
  const [planId, setPlanId] = useState("");
  const [notes, setNotes] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        sdk.admin.listSubscriptions(),
        sdk.admin.listSubscriptionPlans(),
      ]);
      setSubs(s);
      setPlans(p);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void fetch();
  }, []);

  function openMark(sub: any) {
    setMarkTarget(sub);
    setPaidUntil(
      sub.paidUntil
        ? new Date(sub.paidUntil).toISOString().slice(0, 10)
        : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    );
    setPlanId(sub.planId);
    setNotes(sub.notes ?? "");
    setMarkOpen(true);
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!markTarget) return;
    setSaving(true);
    try {
      await sdk.admin.markShopPaid(markTarget.shopId, {
        planId: planId || undefined,
        paidUntil: paidUntil || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`${markTarget.shop?.name ?? "Shop"} marked as paid`);
      setMarkOpen(false);
      void fetch();
    } catch {
      toast.error("Failed to mark paid");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend() {
    if (!suspendTarget || !suspendReason.trim()) return;
    setSuspending(true);
    try {
      await sdk.admin.suspendSubscription(
        suspendTarget.shopId,
        suspendReason.trim(),
      );
      toast.success(`${suspendTarget.shop?.name ?? "Shop"} suspended`);
      setSuspendOpen(false);
      setSuspendTarget(null);
      setSuspendReason("");
      void fetch();
    } catch {
      toast.error("Failed to suspend");
    } finally {
      setSuspending(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await sdk.admin.cancelSubscription(
        cancelTarget.shopId,
        cancelNotes.trim() || undefined,
      );
      toast.success(`${cancelTarget.shop?.name ?? "Shop"} cancelled`);
      setCancelOpen(false);
      setCancelTarget(null);
      setCancelNotes("");
      void fetch();
    } catch {
      toast.error("Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  async function handleResume(sub: any) {
    try {
      await sdk.admin.resumeSubscription(sub.shopId);
      toast.success(`${sub.shop?.name ?? "Shop"} resumed`);
      void fetch();
    } catch {
      toast.error("Failed to resume");
    }
  }

  const columns = [
    {
      key: "shop",
      header: "Shop",
      render: (s: any) => (
        <span className="font-medium">{s.shop?.name ?? "—"}</span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (s: any) => <span>{s.plan?.name ?? "—"}</span>,
    },
    {
      key: "cycle",
      header: "Cycle",
      render: (s: any) => (
        <span className="text-muted-foreground">{s.billingCycle}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (s: any) => (
        <span className="tabular-nums">{formatMoneyCents(s.amountCents)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s: any) => (
        <StatusChip
          label={s.status}
          tone={
            s.status === "ACTIVE"
              ? "success"
              : s.status === "TRIAL"
                ? "warning"
                : s.status === "PAST_DUE"
                  ? "danger"
                  : "neutral"
          }
        />
      ),
    },
    {
      key: "paidUntil",
      header: "Paid Until",
      render: (s: any) => (
        <span className="text-xs text-muted-foreground">
          <FormattedDate iso={s.paidUntil} />
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-56",
      render: (s: any) => (
        <div className="flex gap-1 flex-wrap">
          {s.status !== "CANCELLED" && s.status !== "SUSPENDED" && (
            <>
              <button
                type="button"
                onClick={() => openMark(s)}
                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuspendTarget(s);
                  setSuspendReason("");
                  setSuspendOpen(true);
                }}
                className="rounded-lg border border-warning px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/5"
              >
                Suspend
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(s);
                  setCancelNotes("");
                  setCancelOpen(true);
                }}
                className="rounded-lg border border-destructive px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/5"
              >
                Cancel
              </button>
            </>
          )}
          {s.status === "SUSPENDED" && (
            <>
              <button
                type="button"
                onClick={() => openMark(s)}
                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => handleResume(s)}
                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Resume
              </button>
            </>
          )}
          {s.status === "CANCELLED" && (
            <button
              type="button"
              onClick={() => openMark(s)}
              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Paid
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={subs}
        empty={loading ? "Loading..." : "No subscriptions"}
      />
      {markOpen && markTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMarkOpen(false)}
          />
          <form
            onSubmit={handleMarkPaid}
            className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-semibold">
              Mark Paid — {markTarget.shop?.name ?? "Shop"}
            </h3>
            <div className="space-y-1.5">
              <label className={labelClass}>Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className={inputClass}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Paid Until</label>
              <EthiopianDateInput value={paidUntil} onChange={setPaidUntil} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMarkOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />{" "}
                {saving ? "Saving..." : "Mark as Paid"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suspend modal */}
      {suspendOpen && suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSuspendOpen(false);
              setSuspendTarget(null);
              setSuspendReason("");
            }}
          />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Suspend Subscription</h3>
            <p className="text-sm text-muted-foreground">
              {suspendTarget.shop?.name ?? "Shop"} will lose access until you
              resume.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Reason for suspension
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                placeholder="e.g. Non-payment, policy violation..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSuspendOpen(false);
                  setSuspendTarget(null);
                  setSuspendReason("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={suspending || !suspendReason.trim()}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-warning/90"
              >
                {suspending ? "Suspending..." : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelOpen && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setCancelOpen(false);
              setCancelTarget(null);
              setCancelNotes("");
            }}
          />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-destructive">
              Cancel Subscription
            </h3>
            <p className="text-sm text-muted-foreground">
              This will permanently cancel{" "}
              <strong>{cancelTarget.shop?.name ?? "Shop"}</strong>'s
              subscription. The shop will lose all access immediately. This
              action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                placeholder="Reason for cancellation..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelTarget(null);
                  setCancelNotes("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = "dashboard" | "plans" | "providers" | "subscribers";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: TrendingUp },
  { id: "plans", label: "Plans", icon: Crown },
  { id: "providers", label: "Payment Providers", icon: CreditCard },
  { id: "subscribers", label: "Subscribers", icon: Users },
];

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions & Billing"
        description="Manage plans, payment providers, subscribers, and subscription settings"
        breadcrumb={["Platform", "Subscriptions"]}
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "plans" && <PlansTab />}
      {activeTab === "providers" && <ProvidersTab />}
      {activeTab === "subscribers" && <SubscribersTab />}
    </div>
  );
}
