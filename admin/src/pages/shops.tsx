import { BadgeCheck, Crown, Pencil, Plus, Building2, CreditCard } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable, StatusChip } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { AdminShop, CreateShopDto, UpdateShopAdminDto } from '@/sdk';
import { useI18n } from '@/lib/i18n';
import { FormattedDate } from '@/ui';

interface CreateShopDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function CreateShopDrawer({ open, onClose, onSaved }: CreateShopDrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setOwnerEmail('');
      setOwnerName('');
      setOwnerPhone('');
      setOwnerPassword('');
      setPhone('');
      setAddress('');
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ownerEmail.trim() || !ownerName.trim()) return;
    setSaving(true);
    try {
      await sdk.admin.createShop({
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim() || undefined,
        ownerPassword: ownerPassword.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      } as CreateShopDto);
      toast.success('Shop created');
      onSaved();
    } catch {
      toast.error('Failed to create shop');
    } finally {
      setSaving(false);
    }
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true" aria-label="Create Shop">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Create Shop</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Shop Name *</label>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} required className={ic} placeholder="e.g. Lalibela Beverage Store" />
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Owner Details</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Owner Name *</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className={ic} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Owner Email *</label>
            <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} type="email" required className={ic} placeholder="owner@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Owner Phone</label>
            <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className={ic} placeholder="+251 9XX XXX XXX" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Owner Password <span className="text-xs text-muted-foreground">(optional, auto-generated)</span></label>
            <input value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} type="password" className={ic} placeholder="Leave blank to auto-generate" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Shop Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={ic} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={ic} placeholder="Optional" />
          </div>
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
              {saving ? 'Creating...' : 'Create Shop'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

interface EditShopModalProps {
  shop: AdminShop | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditShopModal({ shop, onClose, onSaved }: EditShopModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setPhone(shop.phone === '—' ? '' : shop.phone);
      setAddress(shop.address === '—' ? '' : shop.address);
      setIsActive(shop.isActive);
      setLowStockThreshold(String(shop.lowStockThreshold ?? 12));
    }
  }, [shop]);

  if (!shop) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setSaving(true);
    try {
      await sdk.admin.updateShop(shop.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        lowStockThreshold: Number(lowStockThreshold),
        isActive,
      } as unknown as UpdateShopAdminDto);
      toast.success('Shop updated');
      onSaved();
    } catch {
      toast.error('Failed to update shop');
    } finally {
      setSaving(false);
    }
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">Edit Shop — {shop.name}</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Shop Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={ic} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={ic} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={ic} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Low Stock Threshold</label>
            <input value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} type="number" min={0} className={ic} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <div className="flex h-10 items-center gap-3">
              <button type="button" onClick={() => setIsActive(!isActive)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isActive ? 'left-4' : 'left-0.5'}`} />
              </button>
              <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
            {saving ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ShopsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [shops, setShops] = useState<AdminShop[]>([]);
  const [subscriptions, setSubscriptions] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminShop | null>(null);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const [list, subs] = await Promise.all([sdk.admin.listShops(), sdk.admin.listSubscriptions()]);
      setShops(list);
      const subMap = new Map<string, any>();
      for (const s of subs) subMap.set(s.shopId, s);
      setSubscriptions(subMap);
    } catch {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchShops(); }, [fetchShops]);

  const filtered = search
    ? shops.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
          s.ownerEmail.toLowerCase().includes(search.toLowerCase()),
      )
    : shops;

  const columns = [
    {
      key: 'name',
      header: 'Shop',
      render: (s: AdminShop) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/shops/${s.id}`); }}
          className="font-medium text-left hover:underline"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            {s.name}
          </div>
        </button>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (s: AdminShop) => (
        <div>
          <p className="text-sm">{s.ownerName}</p>
          <p className="text-xs text-muted-foreground">{s.ownerEmail}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Owner Phone',
      render: (s: AdminShop) => (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {s.ownerPhone ?? s.phone}
          {s.ownerPhone && s.ownerPhoneVerified && (
            <BadgeCheck className="h-4 w-4 text-success" aria-label="Phone verified" />
          )}
        </span>
      ),
    },
    {
      key: 'metrics',
      header: 'Metrics',
      render: (s: AdminShop) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>{s.employeesCount} employees</div>
          <div>{s.beveragesCount} beverages</div>
          <div>{s.salesCount} sales</div>
        </div>
      ),
    },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (s: AdminShop) => {
        const sub = subscriptions.get(s.id);
        if (!sub) return <span className="text-muted-foreground text-xs">—</span>;
        const st = sub.status;
        const tone = st === 'ACTIVE' ? 'success' : st === 'TRIAL' ? 'warning' : st === 'PAST_DUE' ? 'danger' : 'neutral';
        return (
          <div className="flex items-center gap-1.5">
            <Crown className={`h-3.5 w-3.5 ${st === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'}`} />
            <StatusChip label={st} tone={tone as any} />
          </div>
        );
      },
    },
    {
      key: 'active',
      header: 'Status',
      render: (s: AdminShop) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
          {s.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (s: AdminShop) => <span className="text-muted-foreground text-xs"><FormattedDate iso={s.createdAt} /></span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (s: AdminShop) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditTarget(s); }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Edit shop"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shops Management"
        description="All registered shops on the platform"
        breadcrumb={['Platform', 'Shops']}
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Shop
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder="Search shops by name or owner..."
        search={search}
        onSearchChange={setSearch}
        onRowClick={(s) => navigate(`/shops/${s.id}`)}
        empty={loading ? t('loading') : 'No shops found'}
      />

      <CreateShopDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); void fetchShops(); }}
      />

      {editTarget && (
        <EditShopModal
          shop={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); void fetchShops(); }}
        />
      )}
    </div>
  );
}
