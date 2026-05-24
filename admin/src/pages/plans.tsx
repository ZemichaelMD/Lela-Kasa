import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Power } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/ui";
import { sdk } from "@/lib/sdk";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  maxUsers: number;
  maxCustomers: number;
  trialDays: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  features: string[];
}

export default function PlansPage() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formMonthly, setFormMonthly] = useState("");
  const [formYearly, setFormYearly] = useState("");
  const [formMaxUsers, setFormMaxUsers] = useState("");
  const [formMaxCustomers, setFormMaxCustomers] = useState("");
  const [formTrialDays, setFormTrialDays] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  async function fetchPlans() {
    setLoading(true);
    try {
      const data = await (sdk as any).admin?.listPlans?.() ?? [];
      setPlans(data);
    } catch {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/v1/admin/plans`, {
          headers: { Authorization: `Bearer ${(sdk as any)._tokenStore?.getAccessToken?.()}` },
        });
        const json = await res.json();
        setPlans(json?.data ?? json ?? []);
      } catch {
        toast.error("Failed to load plans");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPlans(); }, []);

  function openCreate() {
    setEditing(null);
    setFormName(""); setFormDesc(""); setFormMonthly(""); setFormYearly("");
    setFormMaxUsers("5"); setFormMaxCustomers("100"); setFormTrialDays("14");
    setFormSortOrder("0"); setFormIsDefault(false); setFormIsActive(true);
    setFormFeatures([]); setFeatureInput("");
    setDrawerOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setFormName(plan.name);
    setFormDesc(plan.description || "");
    setFormMonthly(String(plan.monthlyPriceCents / 100));
    setFormYearly(String(plan.yearlyPriceCents / 100));
    setFormMaxUsers(plan.maxUsers === -1 ? "" : String(plan.maxUsers));
    setFormMaxCustomers(plan.maxCustomers === -1 ? "" : String(plan.maxCustomers));
    setFormTrialDays(String(plan.trialDays));
    setFormSortOrder(String(plan.sortOrder));
    setFormIsDefault(plan.isDefault);
    setFormIsActive(plan.isActive);
    setFormFeatures([...plan.features]);
    setFeatureInput("");
    setDrawerOpen(true);
  }

  function addFeature() {
    const f = featureInput.trim();
    if (f && !formFeatures.includes(f)) {
      setFormFeatures([...formFeatures, f]);
      setFeatureInput("");
    }
  }

  function removeFeature(idx: number) {
    setFormFeatures(formFeatures.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!formName.trim()) return toast.error("Plan name is required");
    setSaving(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const token = (sdk as any)._tokenStore?.getAccessToken?.() || "";
      const body = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        monthlyPriceCents: Math.round(parseFloat(formMonthly || "0") * 100),
        yearlyPriceCents: Math.round(parseFloat(formYearly || "0") * 100),
        maxUsers: formMaxUsers === "" ? -1 : parseInt(formMaxUsers, 10),
        maxCustomers: formMaxCustomers === "" ? -1 : parseInt(formMaxCustomers, 10),
        trialDays: parseInt(formTrialDays || "14", 10),
        sortOrder: parseInt(formSortOrder || "0", 10),
        isDefault: formIsDefault,
        isActive: formIsActive,
        features: formFeatures,
      };
      if (editing) {
        await fetch(`${baseUrl}/api/v1/admin/plans/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        toast.success("Plan updated");
      } else {
        await fetch(`${baseUrl}/api/v1/admin/plans`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        toast.success("Plan created");
      }
      setDrawerOpen(false);
      fetchPlans();
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: Plan) {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const token = (sdk as any)._tokenStore?.getAccessToken?.() || "";
      await fetch(`${baseUrl}/api/v1/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      toast.success(plan.isActive ? "Plan deactivated" : "Plan activated");
      fetchPlans();
    } catch {
      toast.error("Failed to toggle plan");
    }
  }

  const filtered = search
    ? plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : plans;

  const columns = [
    { key: "name", header: "Name", render: (p: Plan) => <span className="font-medium">{p.name}</span> },
    { key: "monthly", header: "Monthly", render: (p: Plan) => <span>{formatMoneyCents(p.monthlyPriceCents)}</span> },
    { key: "yearly", header: "Yearly", render: (p: Plan) => <span>{formatMoneyCents(p.yearlyPriceCents)}</span> },
    { key: "trial", header: "Trial Days", render: (p: Plan) => <span>{p.trialDays}</span> },
    { key: "users", header: "Users", render: (p: Plan) => <span>{p.maxUsers === -1 ? "Unlimited" : p.maxUsers}</span> },
    { key: "customers", header: "Customers", render: (p: Plan) => <span>{p.maxCustomers === -1 ? "Unlimited" : p.maxCustomers}</span> },
    {
      key: "active", header: "Active",
      render: (p: Plan) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {p.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions", header: "", className: "w-24",
      render: (p: Plan) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(p); }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title={p.isActive ? "Deactivate" : "Activate"}>
            <Power className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const ic = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Manage pricing plans and features available to shops."
        actions={
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder="Search plans..."
        search={search}
        onSearchChange={setSearch}
        empty={loading ? "Loading..." : "No plans found"}
      />

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit Plan" : "New Plan"}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} required className={ic} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Monthly Price (ETB)</label>
                  <input value={formMonthly} onChange={(e) => setFormMonthly(e.target.value)} type="number" min="0" className={ic} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Yearly Price (ETB)</label>
                  <input value={formYearly} onChange={(e) => setFormYearly(e.target.value)} type="number" min="0" className={ic} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Max Users</label>
                  <input value={formMaxUsers} onChange={(e) => setFormMaxUsers(e.target.value)} type="number" placeholder="-1 = unlimited" className={ic} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Max Customers</label>
                  <input value={formMaxCustomers} onChange={(e) => setFormMaxCustomers(e.target.value)} type="number" placeholder="-1 = unlimited" className={ic} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Trial Days</label>
                  <input value={formTrialDays} onChange={(e) => setFormTrialDays(e.target.value)} type="number" min="0" className={ic} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Sort Order</label>
                  <input value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} type="number" min="0" className={ic} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Features</label>
                <div className="flex gap-2">
                  <input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                    className={ic} placeholder="Type and press Enter" />
                  <button type="button" onClick={addFeature} className="rounded-lg bg-accent px-3 py-2 text-sm hover:bg-accent/80">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formFeatures.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      {f}
                      <button type="button" onClick={() => removeFeature(i)} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">Is Default</p>
                  <p className="text-xs text-muted-foreground">Auto-assigned to new shops</p>
                </div>
                <button type="button" onClick={() => setFormIsDefault((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${formIsDefault ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${formIsDefault ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">Is Active</p>
                  <p className="text-xs text-muted-foreground">Available for selection</p>
                </div>
                <button type="button" onClick={() => setFormIsActive((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${formIsActive ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${formIsActive ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
              <div className="mt-auto flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </div>
  );
}
