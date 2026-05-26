import { ArrowLeft, Ban, BarChart3, Beer, Building2, ChevronDown, ChevronLeft, ChevronUp, CreditCard, Crown, Download, Pencil, Plus, ShoppingCart, Tag, Trash2, Users, UserPlus, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable, StatusChip } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { AdminBeverage, AdminShopDetail, AdminUser, AdminSale, Beverage, PriceTier, TierPrice } from '@/sdk';
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from '@/ui';
import { formatMoneyCents } from '@/utils/money';

const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ shop, onRefresh, subscription, plans }: { shop: AdminShopDetail; onRefresh: () => void; subscription: any; plans: any[] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone === '—' ? '' : shop.phone);
  const [address, setAddress] = useState(shop.address === '—' ? '' : shop.address);
  const [threshold, setThreshold] = useState(String(shop.lowStockThreshold));
  const [saving, setSaving] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [changingOwner, setChangingOwner] = useState(false);
  const [ownerSaving, setOwnerSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await sdk.admin.updateShop(shop.id, { name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, lowStockThreshold: Number(threshold) });
      toast.success('Shop updated');
      setEditing(false);
      onRefresh();
    } catch { toast.error('Failed to update shop'); }
    finally { setSaving(false); }
  }

  async function handleChangeOwner(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerEmail.trim()) return;
    setOwnerSaving(true);
    try {
      await sdk.admin.changeShopOwner(shop.id, { newOwnerEmail: ownerEmail.trim() });
      toast.success('Owner changed');
      setOwnerEmail('');
      setChangingOwner(false);
      onRefresh();
    } catch { toast.error('Failed to change owner'); }
    finally { setOwnerSaving(false); }
  }

  const owner = shop.owner as any;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Employees</p><p className="text-2xl font-bold tabular-nums">{shop.employeesCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Beverages</p><p className="text-2xl font-bold tabular-nums">{shop.beveragesCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Customers</p><p className="text-2xl font-bold tabular-nums">{shop.customersCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Sales</p><p className="text-2xl font-bold tabular-nums">{shop.salesCount}</p></Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Shop Details</h3>
          {!editing && <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Pencil className="h-3 w-3" /> Edit</button>}
        </div>
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><label className="text-sm font-medium">Name</label><input value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Address</label><input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Low Stock Threshold</label><input value={threshold} onChange={e => setThreshold(e.target.value)} type="number" className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {shop.name}</div>
            <div><span className="text-muted-foreground">Phone:</span> {shop.phone}</div>
            <div><span className="text-muted-foreground">Address:</span> {shop.address}</div>
            <div><span className="text-muted-foreground">Currency:</span> {shop.currency}</div>
            <div><span className="text-muted-foreground">Timezone:</span> {shop.timezone}</div>
            <div><span className="text-muted-foreground">Low Stock:</span> {shop.lowStockThreshold}</div>
            <div><span className="text-muted-foreground">Created:</span> <FormattedDate iso={shop.createdAt} /></div>
            <div><span className="text-muted-foreground">ID:</span> {shop.id.slice(0, 12)}...</div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Owner</h3>
          {!changingOwner && <button type="button" onClick={() => setChangingOwner(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Pencil className="h-3 w-3" /> Change</button>}
        </div>
        {changingOwner ? (
          <form onSubmit={handleChangeOwner} className="flex gap-3">
            <input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="New owner email" required type="email" className={`${inputClass} flex-1`} />
            <button type="submit" disabled={ownerSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 shrink-0">{ownerSaving ? '...' : 'Change'}</button>
            <button type="button" onClick={() => setChangingOwner(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent shrink-0">Cancel</button>
          </form>
        ) : (
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Name:</span> {owner?.name ?? '—'}</p>
            <p><span className="text-muted-foreground">Email:</span> {owner?.email ?? '—'}</p>
            <p><span className="text-muted-foreground">Phone:</span> {owner?.phone ?? '—'}</p>
            <p><span className="text-muted-foreground">Status:</span> <StatusChip label={owner?.isActive ? 'Active' : 'Inactive'} tone={owner?.isActive ? 'success' : 'neutral'} /></p>
          </div>
        )}
      </Card>

      {/* Subscription */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Crown className="h-4 w-4" /> Subscription</h3>
          {subscription && subscription.status !== 'ACTIVE' && (
            <MarkPaidModalButton shopId={shop.id} subscription={subscription} plans={plans} onPaid={onRefresh} />
          )}
          {!subscription && (
            <button type="button" onClick={async () => { try { await sdk.admin.ensureShopSubscription(shop.id); toast.success('Subscription created'); onRefresh(); } catch { toast.error('Failed'); } }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Create Subscription
            </button>
          )}
        </div>
        {subscription ? (
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Plan:</span> {subscription.plan?.name ?? '—'}</p>
            <p><span className="text-muted-foreground">Status:</span> <StatusChip label={subscription.status} tone={subscription.status === 'ACTIVE' ? 'success' : subscription.status === 'TRIAL' ? 'warning' : 'danger'} /></p>
            <p><span className="text-muted-foreground">Amount:</span> {formatMoneyCents(subscription.amountCents)}/mo</p>
            <p><span className="text-muted-foreground">Cycle:</span> {subscription.billingCycle}</p>
            <p><span className="text-muted-foreground">Paid Until:</span> <FormattedDate iso={subscription.paidUntil} /></p>
            {subscription.notes && <p><span className="text-muted-foreground">Notes:</span> {subscription.notes}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subscription — click to create a default one</p>
        )}
      </Card>
    </div>
  );
}

function MarkPaidModalButton({ shopId, subscription, plans, onPaid }: { shopId: string; subscription: any; plans: any[]; onPaid: () => void }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(subscription?.planId ?? '');
  const [paidUntil, setPaidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPlanId(subscription?.planId ?? '');
      setPaidUntil(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setNotes(subscription?.notes ?? '');
    }
  }, [open, subscription]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await sdk.admin.markShopPaid(shopId, { planId: planId || undefined, paidUntil: paidUntil || undefined, notes: notes.trim() || undefined });
      toast.success('Marked as paid');
      setOpen(false);
      onPaid();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
        <CreditCard className="h-3.5 w-3.5" /> Mark Paid
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Mark as Paid</h3>
            <div className="space-y-1.5"><label className="text-sm font-medium">Plan</label><select value={planId} onChange={e => setPlanId(e.target.value)} className={ic}>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Paid Until</label><EthiopianDateInput value={paidUntil} onChange={setPaidUntil} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : 'Mark Paid'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ─── Beverages ────────────────────────────────────────────────────────────────

function BeveragesTab({ shopId }: { shopId: string }) {
  const [beverages, setBeverages] = useState<AdminBeverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminBeverage | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sizeMl, setSizeMl] = useState('');
  const [bottlesPerBox, setBottlesPerBox] = useState('24');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const all = await sdk.admin.listBeverages();
      setBeverages(all.filter(b => b.shopId === shopId));
    } catch { toast.error('Failed to load beverages'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { void fetch(); }, [fetch]);

  function openCreate() { setEditTarget(null); setName(''); setBrand(''); setSizeMl(''); setBottlesPerBox('24'); setDrawerOpen(true); setTimeout(() => nameRef.current?.focus(), 50); }
  function openEdit(b: AdminBeverage) { setEditTarget(b); setName(b.name); setBrand(b.brand ?? ''); setSizeMl(b.sizeMl ? String(b.sizeMl) : ''); setBottlesPerBox(String(b.bottlesPerBox)); setDrawerOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await sdk.admin.updateShopBeverage(shopId, editTarget.id, { name: name.trim(), brand: brand.trim() || null, sizeMl: sizeMl ? Number(sizeMl) : null, bottlesPerBox: Number(bottlesPerBox) || 24 });
        toast.success('Beverage updated');
      } else {
        await sdk.admin.createShopBeverage(shopId, { name: name.trim(), brand: brand.trim() || undefined, sizeMl: sizeMl ? Number(sizeMl) : undefined, bottlesPerBox: Number(bottlesPerBox) || 24 });
        toast.success('Beverage created');
      }
      setDrawerOpen(false);
      void fetch();
    } catch { toast.error('Failed to save beverage'); }
    finally { setSaving(false); }
  }

  async function toggleActive(b: AdminBeverage) {
    try {
      await sdk.admin.updateShopBeverage(shopId, b.id, { isActive: !b.isActive });
      setBeverages(prev => prev.map(x => x.id === b.id ? { ...x, isActive: !b.isActive } : x));
      toast.success(b.isActive ? 'Deactivated' : 'Activated');
    } catch { toast.error('Failed to update'); }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (b: AdminBeverage) => <span className="font-medium">{b.name}</span> },
    { key: 'brand', header: 'Brand', render: (b: AdminBeverage) => <span className="text-muted-foreground">{b.brand ?? '—'}</span> },
    { key: 'size', header: 'Size', render: (b: AdminBeverage) => <span>{b.sizeMl ? `${b.sizeMl}ml` : '—'}</span> },
    { key: 'bpb', header: 'Btl/Box', render: (b: AdminBeverage) => <span>{b.bottlesPerBox}</span> },
    { key: 'active', header: 'Status', render: (b: AdminBeverage) => (
      <button type="button" onClick={() => toggleActive(b)} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>{b.isActive ? 'Active' : 'Inactive'}</button>
    )},
    { key: 'actions', header: '', className: 'w-24', render: (b: AdminBeverage) => (
      <button type="button" onClick={() => openEdit(b)} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} rows={beverages} empty={loading ? 'Loading...' : 'No beverages'} toolbar={
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add</button>
      } />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editTarget ? 'Edit Beverage' : 'New Beverage'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input ref={nameRef} value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Brand</label><input value={brand} onChange={e => setBrand(e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Size (ml)</label><input value={sizeMl} onChange={e => setSizeMl(e.target.value)} type="number" className={inputClass} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Bottles/Box *</label><input value={bottlesPerBox} onChange={e => setBottlesPerBox(e.target.value)} type="number" required className={inputClass} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Customers ────────────────────────────────────────────────────────────────

type Customer = { id: string; name: string; phone: string | null; notes: string | null; creditBalanceCents: number; outstandingBoxes: number; outstandingBottles: number };

function CustomersTab({ shopId }: { shopId: string }) {
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [username, setUsername] = useState('');
  const [portalPin, setPortalPin] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sdk.admin.listShopCustomers(shopId);
      setList(data);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { void fetch(); }, [fetch]);

  function openCreate() { setEditTarget(null); setName(''); setPhone(''); setNotes(''); setUsername(''); setPortalPin(''); setDrawerOpen(true); setTimeout(() => nameRef.current?.focus(), 50); }
  function openEdit(c: Customer) { setEditTarget(c); setName(c.name); setPhone(c.phone ?? ''); setNotes(c.notes ?? ''); setUsername((c as any).username ?? ''); setPortalPin(''); setDrawerOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await sdk.admin.updateShopCustomer(shopId, editTarget.id, { name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
        setList(prev => prev.map(c => c.id === updated.id ? updated : c));
        if (portalPin.trim()) {
          await sdk.customers.setCredentials(editTarget.id, { username: username.trim() || name.trim().toLowerCase().replace(/\s+/g, '_'), pin: portalPin.trim() });
          toast.success('Customer updated & portal access set');
        } else {
          toast.success('Customer updated');
        }
      } else {
        const created = await sdk.admin.createShopCustomer(shopId, { name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined });
        setList(prev => [...prev, created]);
        if (portalPin.trim()) {
          await sdk.customers.setCredentials(created.id, { username: username.trim() || name.trim().toLowerCase().replace(/\s+/g, '_'), pin: portalPin.trim() });
          toast.success('Customer created & portal access set');
        } else {
          toast.success('Customer created');
        }
      }
      setDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save customer');
    }
    finally { setSaving(false); }
  }

  async function handleDelete(c: Customer) {
    try {
      await sdk.admin.deleteShopCustomer(shopId, c.id);
      setList(prev => prev.filter(x => x.id !== c.id));
      toast.success('Customer deleted');
    } catch { toast.error('Failed to delete customer'); }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (c: Customer) => <span className="font-medium">{c.name}</span> },
    { key: 'phone', header: 'Phone', render: (c: Customer) => <span className="text-muted-foreground">{c.phone ?? '—'}</span> },
    { key: 'credit', header: 'Credit', render: (c: Customer) => <span className={c.creditBalanceCents > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>{formatMoneyCents(c.creditBalanceCents)}</span> },
    { key: 'boxes', header: 'Boxes Out', render: (c: Customer) => <span>{c.outstandingBoxes}</span> },
    { key: 'bottles', header: 'Bottles Out', render: (c: Customer) => <span>{c.outstandingBottles}</span> },
    { key: 'actions', header: '', className: 'w-24', render: (c: Customer) => (
      <div className="flex gap-1">
        <button type="button" onClick={() => openEdit(c)} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
        <button type="button" onClick={() => handleDelete(c)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} rows={list} empty={loading ? 'Loading...' : 'No customers'} toolbar={
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add</button>
      } />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editTarget ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input ref={nameRef} value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></div>
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Customer Portal Access</p>
            <div className="space-y-1.5"><label className="text-sm font-medium">Username</label><input value={username} onChange={e => setUsername(e.target.value)} className={inputClass} placeholder="Auto-generated from name if empty" /></div>
            <div className="space-y-1.5 mt-3"><label className="text-sm font-medium">Portal PIN</label><input value={portalPin} onChange={e => setPortalPin(e.target.value)} type="password" maxLength={10} className={inputClass} placeholder="Set a numeric PIN for customer login" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Price Tiers ──────────────────────────────────────────────────────────────

type PriceTierItem = { id: string; name: string; kind: string; isDefault: boolean; _count?: { prices: number } };

// ── Inline price edit form ────────────────────────────────────────────────────

function EditPriceRow({ tierId, beverageId, current, onSaved, onCancel }: {
  tierId: string; beverageId: string; current: TierPrice | undefined;
  onSaved: (price: TierPrice) => void; onCancel: () => void;
}) {
  const [boxCents, setBoxCents] = useState(current ? String(current.pricePerBoxCents / 100) : '');
  const [bottleCents, setBottleCents] = useState(current ? String(current.pricePerBottleCents / 100) : '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await sdk.priceTiers.setPrice(tierId, {
        beverageId,
        pricePerBoxCents: Math.round(parseFloat(boxCents) * 100),
        pricePerBottleCents: Math.round(parseFloat(bottleCents) * 100),
      });
      toast.success('Price updated');
      onSaved(saved);
    } catch { toast.error('Failed to update price'); }
    finally { setSaving(false); }
  }

  const ic = 'h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <tr className="border-b border-border bg-primary/5">
      <td className="px-4 py-3" colSpan={5}>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Per Box</label>
            <input value={boxCents} onChange={e => setBoxCents(e.target.value)} type="number" min={0} step="0.01" required className={ic} placeholder="0.00" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Per Bottle</label>
            <input value={bottleCents} onChange={e => setBottleCents(e.target.value)} type="number" min={0} step="0.01" required className={ic} placeholder="0.00" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">Save</button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
          </div>
        </form>
      </td>
    </tr>
  );
}

// ── Price history placeholder ─────────────────────────────────────────────────

function PriceHistoryRow() {
  return (
    <tr className="border-b border-border bg-muted/30">
      <td className="px-6 py-3" colSpan={5}>
        <p className="text-xs text-muted-foreground italic">Price history not available</p>
      </td>
    </tr>
  );
}

// ── Bulk Price Modal ──────────────────────────────────────────────────────────

function BulkPriceModal({ tierId, selectedIds, onClose, onSaved }: {
  tierId: string; selectedIds: Set<string>; onClose: () => void; onSaved: (prices: TierPrice[]) => void;
}) {
  const [boxVal, setBoxVal] = useState('');
  const [bottleVal, setBottleVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const count = selectedIds.size;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProgress(0);
    const ids = Array.from(selectedIds);
    const saved: TierPrice[] = [];
    let done = 0;
    for (const beverageId of ids) {
      try {
        const result = await sdk.priceTiers.setPrice(tierId, {
          beverageId,
          pricePerBoxCents: Math.round(parseFloat(boxVal) * 100),
          pricePerBottleCents: Math.round(parseFloat(bottleVal) * 100),
        });
        saved.push(result);
      } catch { toast.error(`Failed to update price (${beverageId})`); }
      done += 1;
      setProgress(done);
    }
    if (saved.length > 0) {
      toast.success(`Updated prices for ${saved.length} beverages`);
      onSaved(saved);
    }
    setSaving(false);
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">Bulk Set Prices</h3>
        <p className="text-sm text-muted-foreground">Setting price for {count} {count === 1 ? 'beverage' : 'beverages'}</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Per Box *</label>
          <input value={boxVal} onChange={e => setBoxVal(e.target.value)} type="number" min={0} step="0.01" required className={ic} placeholder="0.00" autoFocus />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Per Bottle *</label>
          <input value={bottleVal} onChange={e => setBottleVal(e.target.value)} type="number" min={0} step="0.01" required className={ic} placeholder="0.00" />
        </div>
        {saving && <p className="text-sm text-muted-foreground">{progress} / {count} Saving...</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">Apply to All</button>
        </div>
      </form>
    </div>
  );
}

// ── Tier Detail View (inline) ─────────────────────────────────────────────────

interface PriceRow {
  beverage: Beverage;
  price: TierPrice | undefined;
}

function TierDetailView({ tierId, onBack }: { tierId: string; onBack: () => void }) {
  const [tier, setTier] = useState<PriceTier | null>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBeverageId, setEditingBeverageId] = useState<string | null>(null);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    async function load() {
      try {
        const [tierData, allBeverages, prices] = await Promise.all([
          sdk.priceTiers.findOne(tierId),
          sdk.beverages.list({ pageSize: 200 }),
          sdk.priceTiers.getPrices(tierId),
        ]);
        setTier(tierData);
        const priceMap = new Map(prices.map((p) => [p.beverageId, p]));
        setRows(allBeverages.data.map((b) => ({ beverage: b, price: priceMap.get(b.id) })));
      } catch { toast.error('Failed to load tier details'); }
      finally { setLoading(false); }
    }
    void load();
  }, [tierId]);

  function handlePriceSaved(saved: TierPrice) {
    setEditingBeverageId(null);
    setRows((prev) => prev.map((r) => r.beverage.id === saved.beverageId ? { ...r, price: saved } : r));
  }

  function handleBulkSaved(saved: TierPrice[]) {
    setBulkOpen(false);
    setSelected(new Set());
    setRows((prev) => prev.map((r) => {
      const updated = saved.find((s) => s.beverageId === r.beverage.id);
      return updated ? { ...r, price: updated } : r;
    }));
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.beverage.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.beverage.id)));
  }

  function toggleOne(beverageId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(beverageId)) next.delete(beverageId);
      else next.add(beverageId);
      return next;
    });
  }

  if (loading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Tiers
        </button>
        <div className="text-sm font-semibold">{tier?.name} <span className="text-xs text-muted-foreground font-normal">({tier?.kind})</span></div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} {selected.size === 1 ? 'beverage' : 'beverages'} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent">Clear</button>
            <button type="button" onClick={() => setBulkOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Set Price</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-border" aria-label="Select all" />
                </th>
                <th className="px-4 py-3 font-medium">Beverage</th>
                <th className="px-4 py-3 font-medium">Per Box</th>
                <th className="px-4 py-3 font-medium">Per Bottle</th>
                <th className="px-4 py-3 font-medium w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No beverages found</td></tr>
              )}
              {rows.map((row) => (
                <Fragment key={row.beverage.id}>
                  <tr className={`border-b border-border last:border-0 hover:bg-accent/40 ${selected.has(row.beverage.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(row.beverage.id)} onChange={() => toggleOne(row.beverage.id)} className="h-4 w-4 rounded border-border" aria-label={`Select ${row.beverage.name}`} />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div>{row.beverage.name}</div>
                      {row.beverage.brand && <div className="text-xs text-muted-foreground">{row.beverage.brand}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {row.price ? <span>{formatMoneyCents(row.price.pricePerBoxCents)}</span> : <span className="text-muted-foreground italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.price ? <span>{formatMoneyCents(row.price.pricePerBottleCents)}</span> : <span className="text-muted-foreground italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingBeverageId((prev) => prev === row.beverage.id ? null : row.beverage.id)}
                          className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Edit prices"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="text-xs">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryOpenId((prev) => prev === row.beverage.id ? null : row.beverage.id)}
                          className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Toggle price history"
                        >
                          {historyOpenId === row.beverage.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <span className="text-xs">History</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingBeverageId === row.beverage.id && (
                    <EditPriceRow tierId={tierId} beverageId={row.beverage.id} current={row.price} onSaved={handlePriceSaved} onCancel={() => setEditingBeverageId(null)} />
                  )}
                  {historyOpenId === row.beverage.id && <PriceHistoryRow />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bulkOpen && <BulkPriceModal tierId={tierId} selectedIds={selected} onClose={() => setBulkOpen(false)} onSaved={handleBulkSaved} />}
    </div>
  );
}

// ── Tier List View ────────────────────────────────────────────────────────────

function PriceTiersTab({ shopId }: { shopId: string }) {
  const [list, setList] = useState<PriceTierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('RETAIL');
  const [saving, setSaving] = useState(false);
  const [detailTierId, setDetailTierId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sdk.admin.listShopPriceTiers(shopId);
      setList(data);
    } catch { toast.error('Failed to load price tiers'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { void fetch(); }, [fetch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await sdk.admin.createShopPriceTier(shopId, { name: name.trim(), kind });
      setList(prev => [...prev, created]);
      toast.success('Price tier created');
      setDrawerOpen(false);
    } catch { toast.error('Failed to create price tier'); }
    finally { setSaving(false); }
  }

  const KINDS = ['RETAIL', 'WHOLESALE', 'VIP', 'CUSTOM'];

  if (detailTierId) {
    return <TierDetailView tierId={detailTierId} onBack={() => setDetailTierId(null)} />;
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(t => (
            <button
              type="button"
              key={t.id}
              onClick={() => setDetailTierId(t.id)}
              className="w-full text-left rounded-xl border border-border bg-card p-4 flex flex-col gap-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t.name}</p>
                {t.isDefault && <span className="text-[10px] rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Default</span>}
              </div>
              <p className="text-xs text-muted-foreground">{t.kind} · {t._count?.prices ?? 0} prices</p>
            </button>
          ))}
          <button type="button" onClick={() => { setName(''); setKind('RETAIL'); setDrawerOpen(true); }} className="flex items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary">
            <Plus className="h-5 w-5 mr-2" /> Add Tier
          </button>
        </div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Price Tier">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input value={name} onChange={e => setName(e.target.value)} required className={inputClass} placeholder="e.g. Wholesale" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Kind</label><select value={kind} onChange={e => setKind(e.target.value)} className={inputClass}>{KINDS.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Payment Accounts ─────────────────────────────────────────────────────────

function PaymentAccountsTab({ shopId }: { shopId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('CASH_PERSON');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sdk.admin.listShopPaymentAccounts(shopId);
      setList(data);
    } catch { toast.error('Failed to load payment accounts'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { void fetch(); }, [fetch]);

  function openCreate() { setEditTarget(null); setName(''); setKind('CASH_PERSON'); setHolderName(''); setBankName(''); setAccountNumber(''); setDrawerOpen(true); }
  function openEdit(a: any) { setEditTarget(a); setName(a.name); setKind(a.kind); setHolderName(a.holderName ?? ''); setBankName(a.bankName ?? ''); setAccountNumber(a.accountNumber ?? ''); setDrawerOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await sdk.admin.updateShopPaymentAccount(shopId, editTarget.id, { name: name.trim(), kind, holderName: holderName.trim() || null, bankName: bankName.trim() || null, accountNumber: accountNumber.trim() || null });
        setList(prev => prev.map(a => a.id === updated.id ? updated : a));
        toast.success('Account updated');
      } else {
        const created = await sdk.admin.createShopPaymentAccount(shopId, { name: name.trim(), kind, holderName: holderName.trim() || undefined, bankName: bankName.trim() || undefined, accountNumber: accountNumber.trim() || undefined });
        setList(prev => [...prev, created]);
        toast.success('Account created');
      }
      setDrawerOpen(false);
    } catch { toast.error('Failed to save account'); }
    finally { setSaving(false); }
  }

  const KINDS = ['CASH_PERSON', 'BANK', 'MOBILE_MONEY', 'OTHER'];
  const KIND_LABELS: Record<string, string> = { CASH_PERSON: 'Cash', BANK: 'Bank', MOBILE_MONEY: 'Mobile Money', OTHER: 'Other' };

  const columns = [
    { key: 'name', header: 'Name', render: (a: any) => <span className="font-medium">{a.name}</span> },
    { key: 'kind', header: 'Kind', render: (a: any) => <span className="text-xs text-muted-foreground">{KIND_LABELS[a.kind] ?? a.kind}</span> },
    { key: 'holder', header: 'Holder', render: (a: any) => <span className="text-muted-foreground">{a.holderName ?? '—'}</span> },
    { key: 'active', header: 'Active', render: (a: any) => <StatusChip label={a.isActive ? 'Active' : 'Inactive'} tone={a.isActive ? 'success' : 'neutral'} /> },
    { key: 'actions', header: '', className: 'w-24', render: (a: any) => (
      <button type="button" onClick={() => openEdit(a)} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} rows={list} empty={loading ? 'Loading...' : 'No accounts'} toolbar={
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add</button>
      } />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editTarget ? 'Edit Account' : 'New Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Kind</label><select value={kind} onChange={e => setKind(e.target.value)} className={inputClass}>{KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}</select></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Holder Name</label><input value={holderName} onChange={e => setHolderName(e.target.value)} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Bank/Provider</label><input value={bankName} onChange={e => setBankName(e.target.value)} className={inputClass} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Account/Phone #</label><input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={inputClass} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Employees ────────────────────────────────────────────────────────────────

function EmployeesTab({ shopId, allUsers, onRefresh }: { shopId: string; allUsers: AdminUser[]; onRefresh: () => void }) {
  const [employees, setEmployees] = useState<AdminUser[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEmployees(allUsers.filter(u => u.shopId === shopId)); }, [allUsers, shopId]);

  function openInvite() { setEditTarget(null); setName(''); setEmail(''); setPhone(''); setRole('EMPLOYEE'); setDrawerOpen(true); }
  function openEdit(u: AdminUser) { setEditTarget(u); setName(u.name ?? ''); setEmail(u.email); setPhone(u.phone ?? ''); setRole(u.role); setActive(u.isActive); setDrawerOpen(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await sdk.admin.updateShopUser(shopId, editTarget.id, { name: name.trim() || undefined, phone: phone.trim() || null, role: role as any, isActive: active });
        toast.success('User updated');
      } else {
        await sdk.admin.inviteShopUser(shopId, { email: email.trim(), name: name.trim(), phone: phone.trim() || undefined, role });
        toast.success('User invited');
      }
      setDrawerOpen(false);
      onRefresh();
    } catch { toast.error('Failed to save user'); }
    finally { setSaving(false); }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (u: AdminUser) => <span className="font-medium">{u.name ?? '—'}</span> },
    { key: 'email', header: 'Email', render: (u: AdminUser) => <span className="text-muted-foreground">{u.email}</span> },
    { key: 'role', header: 'Role', render: (u: AdminUser) => <StatusChip label={u.role} tone={u.role === 'OWNER' ? 'info' : 'neutral'} /> },
    { key: 'active', header: 'Status', render: (u: AdminUser) => <StatusChip label={u.isActive ? 'Active' : 'Inactive'} tone={u.isActive ? 'success' : 'neutral'} /> },
    { key: 'actions', header: '', className: 'w-24', render: (u: AdminUser) => (
      <button type="button" onClick={() => openEdit(u)} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} rows={employees} empty="No employees" toolbar={
        <button type="button" onClick={openInvite} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><UserPlus className="h-4 w-4" /> Invite</button>
      } />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editTarget ? 'Edit User' : 'Invite User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>
          {!editTarget && <div className="space-y-1.5"><label className="text-sm font-medium">Email *</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" required className={inputClass} /></div>}
          <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Role</label><select value={role} onChange={e => setRole(e.target.value)} className={inputClass}><option value="EMPLOYEE">Employee</option><option value="OWNER">Owner</option></select></div>
          {editTarget && <div className="flex items-center gap-3"><span className="text-sm">Active</span><button type="button" onClick={() => setActive(!active)} className={`relative h-5 w-9 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${active ? 'left-4' : 'left-0.5'}`} /></button></div>}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : editTarget ? 'Save' : 'Invite'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// ─── Sales ────────────────────────────────────────────────────────────────────

function SaleDetailView({ saleId, onBack, shopId }: { saleId: string; onBack: () => void; shopId: string }) {
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    setLoading(true);
    sdk.admin.findOneSale(saleId)
      .then(setSale)
      .catch(() => toast.error('Failed to load sale'))
      .finally(() => setLoading(false));
  }, [saleId]);

  async function handleVoid() {
    if (!sale) return;
    setVoiding(true);
    try {
      await sdk.sales.void(sale.id, voidReason.trim() || '');
      toast.success('Sale voided');
      setVoidOpen(false);
      const data = await sdk.admin.findOneSale(sale.id);
      setSale(data);
    } catch { toast.error('Failed to void sale'); }
    finally { setVoiding(false); }
  }

  function formatDateTime(iso: string) {
    try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  }

  function sTone(status: string): 'success' | 'warning' | 'neutral' {
    if (status === 'CONFIRMED') return 'success';
    if (status === 'OPEN') return 'warning';
    return 'neutral';
  }

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  if (!sale) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Back to Sales</button>
        <Card className="p-12 text-center text-muted-foreground">Sale not found</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Sales
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Sale #{sale.id.slice(-6).toUpperCase()}</span>
          <StatusChip label={sale.status} tone={sTone(sale.status)} />
          {sale.status !== 'CANCELLED' && (
            <button type="button" onClick={() => { setVoidReason(''); setVoidOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/5"><Ban className="h-3.5 w-3.5" /> Void</button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sale Info</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium text-sm">{sale.customer?.name ?? 'Walk-in'}</p>
                {sale.customer?.phone && <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm">{formatDateTime(sale.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Price Tier</p>
                <p className="text-sm">{sale.priceTier?.name ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="text-sm">{sale.createdBy?.name ?? '—'}</p>
              </div>
            </div>
            {sale.voidReason && (
              <div className="mt-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
                <p className="font-semibold">Void Reason</p>
                <p className="mt-0.5">{sale.voidReason}</p>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-6 py-3">Beverage</th>
                    <th className="px-4 sm:px-6 py-3">Qty</th>
                    <th className="px-4 sm:px-6 py-3">Unit Price</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(sale.lines ?? []).map((item: any) => {
                    const qty: string[] = [];
                    if (item.boxes > 0) qty.push(`${item.boxes} box${item.boxes > 1 ? 'es' : ''}`);
                    if (item.bottles > 0) qty.push(`${item.bottles} btl`);
                    return (
                      <tr key={item.id} className="hover:bg-accent/20">
                        <td className="px-4 sm:px-6 py-4 font-medium">{item.beverage?.name ?? 'Beverage'}</td>
                        <td className="px-4 sm:px-6 py-4 tabular-nums">{qty.length > 0 ? qty.join(' + ') : '—'}</td>
                        <td className="px-4 sm:px-6 py-4 tabular-nums">{formatMoneyCents(item.pricePerBoxCents)}/box</td>
                        <td className="px-4 sm:px-6 py-4 text-right font-medium tabular-nums">{formatMoneyCents(item.lineTotalCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-6 py-3">Date</th>
                    <th className="px-4 sm:px-6 py-3">Account</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(sale.payments ?? []).length === 0 && (
                    <tr><td colSpan={3} className="px-4 sm:px-6 py-8 text-center text-muted-foreground italic">No payments recorded</td></tr>
                  )}
                  {(sale.payments ?? []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-accent/20">
                      <td className="px-4 sm:px-6 py-4 text-muted-foreground"><FormattedDate iso={p.createdAt} /></td>
                      <td className="px-4 sm:px-6 py-4 font-medium">{p.paymentAccount?.name ?? 'Other'}</td>
                      <td className="px-4 sm:px-6 py-4 text-right font-semibold text-success tabular-nums">{formatMoneyCents(p.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {(sale.containerKasas?.length ?? 0) > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Container Kasa</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 sm:px-6 py-3">Beverage</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(sale.containerKasas ?? []).map((k: any) => (
                      <tr key={k.id} className="hover:bg-accent/20">
                        <td className="px-4 sm:px-6 py-4 font-medium">{k.beverage?.name ?? 'Beverage'}</td>
                        <td className="px-4 sm:px-6 py-4 text-right tabular-nums">{k.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {(sale.returnedContainers?.length ?? 0) > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Returned Containers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 sm:px-6 py-3">Beverage</th>
                      <th className="px-4 sm:px-6 py-3">Boxes</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Bottles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(sale.returnedContainers ?? []).map((r: any) => (
                      <tr key={r.id} className="hover:bg-accent/20">
                        <td className="px-4 sm:px-6 py-4 font-medium">{r.beverage?.name ?? 'Beverage'}</td>
                        <td className="px-4 sm:px-6 py-4 tabular-nums">{r.boxes}</td>
                        <td className="px-4 sm:px-6 py-4 text-right tabular-nums">{r.bottles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">{formatMoneyCents(sale.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-success tabular-nums">{formatMoneyCents(sale.paidCents)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span>Balance</span>
                  <span className={sale.subtotalCents > sale.paidCents ? 'text-destructive tabular-nums' : 'tabular-nums'}>
                    {formatMoneyCents(sale.subtotalCents - sale.paidCents)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {sale.notes && (
            <Card className="p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
              <p className="text-sm text-muted-foreground">{sale.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Void dialog */}
      {voidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setVoidOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold">Void this sale?</h3>
            <p className="mt-1 text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="mt-3 space-y-1.5">
              <label className="text-sm font-medium">Reason</label>
              <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Enter reason..." />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setVoidOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="button" onClick={handleVoid} disabled={voiding} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {voiding ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesTab({ shopId }: { shopId: string }) {
  const [sales, setSales] = useState<AdminSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Load customers for filter
  useEffect(() => {
    sdk.customers.list({ pageSize: 500 }).then(d => setCustomers(d.data)).catch(() => {});
  }, []);

  const fetchSales = useCallback(() => {
    setLoading(true);
    sdk.admin.listSales({ shopId, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, customerId: filterCustomerId || undefined })
      .then(setSales)
      .catch(() => toast.error('Failed to load sales'))
      .finally(() => setLoading(false));
  }, [shopId, dateFrom, dateTo, filterCustomerId]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  if (selectedSaleId) {
    return <SaleDetailView saleId={selectedSaleId} onBack={() => setSelectedSaleId(null)} shopId={shopId} />;
  }

  const columns = [
    { key: 'date', header: 'Date', render: (s: AdminSale) => <span><FormattedDate iso={s.saleDate} /></span> },
    { key: 'customer', header: 'Customer', render: (s: AdminSale) => <span>{s.customer?.name ?? '—'}</span> },
    { key: 'total', header: 'Total', render: (s: AdminSale) => <span className="font-medium tabular-nums">{formatMoneyCents(s.subtotalCents)}</span> },
    { key: 'paid', header: 'Paid', render: (s: AdminSale) => <span className="tabular-nums text-success">{formatMoneyCents(s.paidCents)}</span> },
    { key: 'balance', header: 'Balance', render: (s: AdminSale) => <span className={`tabular-nums ${s.creditDeltaCents > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatMoneyCents(s.creditDeltaCents)}</span> },
    { key: 'status', header: 'Status', render: (s: AdminSale) => <StatusChip label={s.status} tone={s.status === 'CONFIRMED' ? 'success' : s.status === 'CANCELLED' ? 'neutral' : 'warning'} /> },
  ];

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Date</span>
      <EthiopianDateInput value={dateFrom} onChange={setDateFrom} />
      <span className="text-xs text-muted-foreground">—</span>
      <EthiopianDateInput value={dateTo} onChange={setDateTo} />
      <select value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40">
        <option value="">All Customers</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={sales}
        filterBar={filterBar}
        activeFilterCount={(dateFrom || dateTo ? 1 : 0) + (filterCustomerId ? 1 : 0)}
        onClearFilters={() => { setDateFrom(''); setDateTo(''); setFilterCustomerId(''); }}
        onRowClick={s => setSelectedSaleId(s.id)}
        empty={loading ? 'Loading...' : 'No sales'}
      />
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ shopId }: { shopId: string }) {
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<'sales' | 'customers' | 'beverages'>('sales');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        const all = await sdk.admin.listSales({ shopId, includeLines: tab === 'beverages', dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
        const shopSales = all.filter((s: any) => s.saleDate >= dateFrom && s.saleDate <= dateTo + 'T23:59:59');

        if (tab === 'sales') {
          const byDay: Record<string, any> = {};
          for (const s of shopSales) {
            const day = s.saleDate.slice(0, 10);
            if (!byDay[day]) byDay[day] = { date: day, count: 0, amountCents: 0 };
            byDay[day].count++;
            byDay[day].amountCents += s.subtotalCents;
          }
          setRows(Object.values(byDay).sort((a: any, b: any) => a.date.localeCompare(b.date)));
        } else if (tab === 'customers') {
          const byCust: Record<string, any> = {};
          for (const s of shopSales) {
            const name = s.customer?.name ?? 'Walk-in';
            if (!byCust[name]) byCust[name] = { customerName: name, salesCount: 0, totalCents: 0, paidCents: 0 };
            byCust[name].salesCount++;
            byCust[name].totalCents += s.subtotalCents;
            byCust[name].paidCents += s.paidCents;
          }
          setRows(Object.values(byCust).sort((a: any, b: any) => b.totalCents - a.totalCents));
        } else {
          const lines: { name: string; boxes: number; bottles: number; total: number }[] = [];
          const seen = new Map<string, typeof lines[0]>();
          for (const sale of shopSales) {
            if ((sale as any).lines) {
              for (const l of (sale as any).lines) {
                const name = l.beverage?.name ?? 'Unknown';
                const existing = seen.get(name) || { name, boxes: 0, bottles: 0, total: 0 };
                existing.boxes += l.boxes || 0;
                existing.bottles += l.bottles || 0;
                existing.total += l.lineTotalCents || 0;
                seen.set(name, existing);
              }
            }
          }
          setRows(Array.from(seen.values()).sort((a, b) => b.total - a.total));
        }
      } catch { toast.error('Failed to load reports'); }
      finally { setLoading(false); }
    };
    void load();
  }, [shopId, dateFrom, dateTo, tab]);

  const TABS = [
    { id: 'sales' as const, label: 'Sales Summary' },
    { id: 'customers' as const, label: 'By Customer' },
    { id: 'beverages' as const, label: 'By Beverage' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground text-xs">From</span><EthiopianDateInput value={dateFrom} onChange={setDateFrom} /></div>
        <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground text-xs">To</span><EthiopianDateInput value={dateTo} onChange={setDateTo} /></div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5 ml-auto">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <Card className="p-5">
        {loading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period</p>
        ) : tab === 'sales' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs font-medium text-muted-foreground"><th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4 text-right">Count</th><th className="pb-2 text-right">Amount</th></tr></thead>
              <tbody>{rows.map((r: any) => <tr key={r.date} className="border-b border-border last:border-0"><td className="py-2 pr-4"><FormattedDate iso={r.date} /></td><td className="py-2 pr-4 text-right tabular-nums">{r.count}</td><td className="py-2 text-right tabular-nums">{formatMoneyCents(r.amountCents)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : tab === 'customers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs font-medium text-muted-foreground"><th className="pb-2 pr-4">Customer</th><th className="pb-2 pr-4 text-right">Sales</th><th className="pb-2 pr-4 text-right">Total</th><th className="pb-2 text-right">Paid</th></tr></thead>
              <tbody>{rows.map((r: any) => <tr key={r.customerName} className="border-b border-border last:border-0"><td className="py-2 pr-4 font-medium">{r.customerName}</td><td className="py-2 pr-4 text-right tabular-nums">{r.salesCount}</td><td className="py-2 pr-4 text-right tabular-nums">{formatMoneyCents(r.totalCents)}</td><td className="py-2 text-right tabular-nums text-success">{formatMoneyCents(r.paidCents)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs font-medium text-muted-foreground"><th className="pb-2 pr-4">Beverage</th><th className="pb-2 pr-4 text-right">Boxes</th><th className="pb-2 pr-4 text-right">Bottles</th><th className="pb-2 text-right">Total</th></tr></thead>
              <tbody>{rows.map((r: any) => <tr key={r.name} className="border-b border-border last:border-0"><td className="py-2 pr-4 font-medium">{r.name}</td><td className="py-2 pr-4 text-right tabular-nums">{r.boxes}</td><td className="py-2 pr-4 text-right tabular-nums">{r.bottles}</td><td className="py-2 text-right tabular-nums">{formatMoneyCents(r.total)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Subscription History Tab ─────────────────────────────────────────────────

function SubscriptionTab({ shopId }: { shopId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendUntil, setExtendUntil] = useState('');
  const [extending, setExtending] = useState(false);
  const [histDateFrom, setHistDateFrom] = useState('');
  const [histDateTo, setHistDateTo] = useState('');
  const [histAction, setHistAction] = useState('');
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [h, s, pp] = await Promise.all([
        sdk.admin.getSubscriptionHistory(shopId),
        sdk.admin.getShopSubscription(shopId).catch(() => null),
        sdk.admin.listPendingPayments().catch(() => []),
      ]);
      setHistory(h); setSub(s);
      setPendingPayments(pp);
      const shopPending = pp.filter((p: any) => p.shopId === shopId);
      if (shopPending.length > 0 && !paymentModal) setPaymentModal(shopPending[0]);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { void fetch(); }, [shopId]);

  function openPaymentFromHistory(h: any) {
    const tx = pendingPayments.find((p: any) => p.shopId === shopId);
    if (tx) {
      setPaymentModal(tx);
    } else {
      // Payment already processed — show readonly info from history entry
      setPaymentModal({
        id: h.id,
        shopId,
        provider: null,
        amountCents: h.amountCents || sub?.plan?.monthlyPriceCents || 0,
        reference: h.notes?.match(/[—] (.+)/)?.[1] || null,
        notes: h.notes,
        createdAt: h.createdAt,
        plan: h.plan || sub?.plan,
        readonly: true,
        status: h.newStatus === 'ACTIVE' ? 'Verified' : h.newStatus === 'PENDING_VERIFICATION' ? 'Pending' : h.newStatus || 'Processed',
      });
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this subscription? The shop will lose access.')) return;
    try { await sdk.admin.cancelSubscription(shopId); toast.success('Cancelled'); void fetch(); }
    catch { toast.error('Failed'); }
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    setSuspending(true);
    try { await sdk.admin.suspendSubscription(shopId, suspendReason.trim()); toast.success('Suspended'); setSuspendOpen(false); void fetch(); }
    catch { toast.error('Failed'); }
    finally { setSuspending(false); }
  }

  async function handleResume() {
    try { await sdk.admin.resumeSubscription(shopId); toast.success('Resumed'); void fetch(); }
    catch { toast.error('Failed'); }
  }

  async function handleExtend() {
    if (!extendUntil) return;
    setExtending(true);
    try {
      await sdk.admin.markShopPaid(shopId, { planId: sub?.planId, paidUntil: extendUntil, notes: `Extended to ${extendUntil}` });
      toast.success('Plan extended');
      setExtendOpen(false);
      void fetch();
    } catch { toast.error('Failed to extend'); }
    finally { setExtending(false); }
  }

  async function handleVerifyPayment() {
    if (!paymentModal) return;
    setActing(true);
    try {
      await sdk.admin.verifyPayment(paymentModal.id);
      toast.success('Payment verified — subscription extended');
      setPaymentModal(null);
      void fetch();
    } catch { toast.error('Failed to verify'); }
    finally { setActing(false); }
  }

  async function handleRejectPayment() {
    if (!paymentModal) return;
    setActing(true);
    try {
      await sdk.admin.rejectPayment(paymentModal.id, rejectReason || undefined);
      toast.success('Payment rejected');
      setRejectOpen(false);
      setPaymentModal(null);
      setRejectReason('');
      void fetch();
    } catch { toast.error('Failed to reject'); }
    finally { setActing(false); }
  }

  const actionColors: Record<string, string> = {
    CREATED: 'bg-muted text-muted-foreground',
    ACTIVATED: 'bg-success/15 text-success',
    PAYMENT: 'bg-primary/10 text-primary',
    EXTENDED: 'bg-sky-500/10 text-sky-600',
    CANCELLED: 'bg-destructive/15 text-destructive',
    SUSPENDED: 'bg-warning/15 text-warning',
    RESUMED: 'bg-success/15 text-success',
    EXPIRED: 'bg-muted text-muted-foreground',
    PLAN_CHANGE: 'bg-primary/10 text-primary',
  };

  function fmt(iso: string) {
    try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  }

  return (
    <div className="space-y-4">
      {sub && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 text-sm">
              <p><span className="text-muted-foreground">Status:</span> <StatusChip label={sub.status} tone={sub.status === 'ACTIVE' ? 'success' : sub.status === 'TRIAL' ? 'warning' : sub.status === 'SUSPENDED' ? 'danger' : 'neutral'} /></p>
              {sub.plan?.name && <p><span className="text-muted-foreground">Plan:</span> {sub.plan.name}</p>}
              {sub.suspendReason && <p><span className="text-muted-foreground">Suspend reason:</span> {sub.suspendReason}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {sub.status !== 'CANCELLED' && (
                <button type="button" onClick={() => { setExtendUntil(sub.paidUntil ? new Date(new Date(sub.paidUntil).getTime() + 30 * 86400000).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)); setExtendOpen(true); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Extend Plan</button>
              )}
              {sub.status !== 'CANCELLED' && sub.status !== 'SUSPENDED' && (
                <>
                  <button type="button" onClick={() => { setSuspendReason(''); setSuspendOpen(true); }} className="rounded-lg border border-warning px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/5">Suspend</button>
                  <button type="button" onClick={() => { setCancelNotes(''); setCancelOpen(true); }} className="rounded-lg border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5">Cancel</button>
                </>
              )}
              {sub.status === 'SUSPENDED' && (
                <button type="button" onClick={handleResume} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Resume</button>
              )}
            </div>
          </div>
        </Card>
      )}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">History</h3>
          {(histDateFrom || histDateTo || histAction) && (
            <button type="button" onClick={() => { setHistDateFrom(''); setHistDateTo(''); setHistAction(''); }} className="text-xs text-primary hover:underline">Clear filters</button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">From</span><EthiopianDateInput value={histDateFrom} onChange={setHistDateFrom} /></div>
          <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">To</span><EthiopianDateInput value={histDateTo} onChange={setHistDateTo} /></div>
          <select value={histAction} onChange={e => setHistAction(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40">
            <option value="">All actions</option>
            {Object.keys(actionColors).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : (
          <>
            {(() => {
              const filtered = history.filter((h: any) => {
                if (histAction && h.action !== histAction) return false;
                if (histDateFrom && h.createdAt < histDateFrom) return false;
                if (histDateTo && h.createdAt > histDateTo + 'T23:59:59') return false;
                return true;
              });

              if (filtered.length === 0) {
                return <p className="py-6 text-center text-sm text-muted-foreground">No history entries match your filters</p>;
              }

              return (
                <div className="space-y-2">
                  {filtered.map((h: any) => {
                    const isPending = h.newStatus === 'PENDING_VERIFICATION';
                    const isVerified = h.action === 'PAYMENT' && h.newStatus === 'ACTIVE' && h.notes?.includes('verified');
                    const isRejected = h.action === 'PAYMENT' && h.notes?.includes('rejected');
                    const borderClass = isPending ? 'border-l-2 border-l-amber-500 cursor-pointer hover:bg-accent'
                      : isVerified ? 'border-l-2 border-l-green-500'
                      : isRejected ? 'border-l-2 border-l-red-500'
                      : 'border-border';
                    return (
                      <button
                        type="button"
                        key={h.id}
                        onClick={isPending ? () => openPaymentFromHistory(h) : undefined}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${borderClass}`}
                      >
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5 ${actionColors[h.action] || 'bg-muted'}`}>{h.action}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                            {h.plan?.name && <span className="text-xs text-muted-foreground">Plan: {h.plan.name}</span>}
                            {h.amountCents != null && <span className="text-xs text-muted-foreground">Amount: {formatMoneyCents(h.amountCents)}</span>}
                            {h.prevStatus && h.newStatus && <span className="text-xs text-muted-foreground">{h.prevStatus} → {h.newStatus}</span>}
                          </div>
                          {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                          {isPending && <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Click to verify or reject</span>}
                          {isVerified && <span className="mt-1 inline-flex items-center rounded-full border border-green-500/30 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">Verified</span>}
                          {isRejected && <span className="mt-1 inline-flex items-center rounded-full border border-red-500/30 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">Rejected</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{fmt(h.createdAt)}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </Card>

      {/* Payment verification modal */}
      {paymentModal && !rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentModal(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Payment Verification
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Shop</span><span className="font-medium">{paymentModal.shop?.name || shopId?.slice(0, 12)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{paymentModal.provider?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span>{sub?.plan?.name || sub?.planName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-lg">{formatMoneyCents(paymentModal.amountCents || sub?.plan?.monthlyPriceCents || 0)}</span></div>
              {paymentModal.reference && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span>{paymentModal.reference}</span></div>}
              {paymentModal.notes && <div className="flex justify-between"><span className="text-muted-foreground">Notes</span><span className="text-right max-w-[200px] text-xs">{paymentModal.notes}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-xs">{new Date(paymentModal.createdAt).toLocaleString()}</span></div>
            </div>
            {paymentModal.status && paymentModal.readonly && (
              <div className="text-center py-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  paymentModal.status === 'Verified' ? 'bg-success/15 text-success' :
                  paymentModal.status === 'Rejected' ? 'bg-destructive/15 text-destructive' :
                  'bg-warning/15 text-warning'
                }`}>{paymentModal.status}</span>
              </div>
            )}
            {!paymentModal.readonly && (
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setRejectReason(''); setRejectOpen(true); }} disabled={acting}
                  className="flex-1 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60">
                  Reject
                </button>
                <button type="button" onClick={handleVerifyPayment} disabled={acting}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {acting ? 'Processing...' : 'Verify & Extend'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-destructive">Reject Payment</h3>
            <p className="text-sm text-muted-foreground">This will mark the payment as rejected. The customer will be notified.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason for rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                placeholder="e.g. Payment not received, incorrect amount..." autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="button" onClick={handleRejectPayment} disabled={acting} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90">
                {acting ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-destructive">Cancel Subscription</h3>
            <p className="text-sm text-muted-foreground">This will permanently cancel the subscription. The shop will lose all access immediately. This action cannot be undone.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                value={cancelNotes}
                onChange={e => setCancelNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                placeholder="Reason for cancellation..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Keep Active</button>
              <button type="button" onClick={handleCancel} disabled={cancelling} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend modal */}
      {extendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setExtendOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Extend Plan</h3>
            <p className="text-sm text-muted-foreground">Set the new paid-until date for this subscription.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Paid Until</label>
              <EthiopianDateInput value={extendUntil} onChange={setExtendUntil} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setExtendOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="button" onClick={handleExtend} disabled={extending || !extendUntil} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
                {extending ? 'Extending...' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {suspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSuspendOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Suspend Subscription</h3>
            <p className="text-sm text-muted-foreground">The shop will lose access until you resume.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason for suspension</label>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                placeholder="e.g. Non-payment, policy violation..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSuspendOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button type="button" onClick={handleSuspend} disabled={suspending || !suspendReason.trim()} className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-warning/90">
                {suspending ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'subscription' | 'beverages' | 'customers' | 'price-tiers' | 'payment-accounts' | 'employees' | 'sales' | 'reports';

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<AdminShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [shopData, usersData, subData, plansData] = await Promise.all([
        sdk.admin.findOneShop(id),
        sdk.admin.listUsers(),
        sdk.admin.getShopSubscription(id).catch(() => null),
        sdk.admin.listSubscriptionPlans().catch(() => []),
      ]);
      setShop(shopData);
      setAllUsers(usersData);
      setSubscription(subData);
      setPlans(plansData);
    } catch { toast.error('Failed to load shop'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void fetch(); }, [fetch]);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'beverages', label: 'Beverages', icon: Beer },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'price-tiers', label: 'Price Tiers', icon: Tag },
    { id: 'payment-accounts', label: 'Payment Accounts', icon: CreditCard },
    { id: 'employees', label: 'Employees', icon: UserPlus },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="flex gap-2"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-20" /></div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/shops')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
        <Card className="p-8 text-center text-sm text-muted-foreground">Shop not found</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={shop.name} description={`${(shop.owner as any)?.name ?? '—'} · ${shop.beveragesCount} beverages · ${shop.salesCount} sales`} breadcrumb={['Platform', 'Shops', shop.name]} actions={
        <button type="button" onClick={() => navigate('/shops')} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"><ArrowLeft className="h-4 w-4" /> All Shops</button>
      } />

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'overview' && <OverviewTab shop={shop} onRefresh={() => void fetch()} subscription={subscription} plans={plans} />}
        {activeTab === 'subscription' && <SubscriptionTab shopId={shop.id} />}
        {activeTab === 'beverages' && <BeveragesTab shopId={shop.id} />}
        {activeTab === 'customers' && <CustomersTab shopId={shop.id} />}
        {activeTab === 'price-tiers' && <PriceTiersTab shopId={shop.id} />}
        {activeTab === 'payment-accounts' && <PaymentAccountsTab shopId={shop.id} />}
        {activeTab === 'employees' && <EmployeesTab shopId={shop.id} allUsers={allUsers} onRefresh={() => void fetch()} />}
        {activeTab === 'sales' && <SalesTab shopId={shop.id} />}
        {activeTab === 'reports' && <ReportsTab shopId={shop.id} />}
      </div>
    </div>
  );
}
