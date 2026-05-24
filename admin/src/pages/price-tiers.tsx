import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { PriceTier } from '@/sdk';
import { ApiError } from '@/sdk';
import { Card } from '@/ui';

import { useI18n } from '@/lib/i18n';

// ─── Tier kind badge ──────────────────────────────────────────────────────────

const KIND_STYLES: Record<string, string> = {
  RETAIL: 'bg-primary/10 text-primary',
  WHOLESALE: 'bg-success/15 text-success',
  VIP: 'bg-warning/15 text-warning',
  CUSTOM: 'bg-muted text-muted-foreground',
};

function KindBadge({ kind }: { kind: string }) {
  const { t } = useI18n();
  const cls = KIND_STYLES[kind] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {t(kind.toLowerCase() as any)}
    </span>
  );
}

// ─── Tier Drawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  editing: PriceTier | null;
  onSaved: (t: PriceTier) => void;
}

function TierDrawer({ open, onClose, editing, onSaved }: DrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<string>('RETAIL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setKind(editing?.kind ?? 'RETAIL');
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const saved = editing
        ? await sdk.priceTiers.update(editing.id, { name: name.trim(), kind })
        : await sdk.priceTiers.create({ name: name.trim(), kind });
      toast.success(editing ? t('priceTierUpdated') : t('priceTierCreated'));
      onSaved(saved);
    } catch {
      toast.error(t('failedSavePriceTier'));
    } finally {
      setSaving(false);
    }
  }

  const KINDS = [
    { value: 'RETAIL', label: t('retail') },
    { value: 'WHOLESALE', label: t('wholesale') },
    { value: 'VIP', label: t('vip') },
    { value: 'CUSTOM', label: t('custom') },
  ];

  const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? t('editPriceTier') : t('newPriceTier')}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{editing ? t('editPriceTier') : t('newPriceTier')}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('name')} *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} placeholder="e.g. Wholesale" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('kind')}</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
              {saving ? t('saving') : editing ? t('saveChanges') : t('create')}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

function DeleteDialog({ tier, onConfirm, onCancel, deleting }: { tier: PriceTier | null; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  const { t } = useI18n();
  if (!tier) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t('deleteTierQuestion')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('permanentlyRemoveTier')} <strong>{tier.name}</strong>. {t('permanentlyRemoveTierDesc')}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90">
            {deleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PriceTiersPage() {
  const { t } = useI18n();
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PriceTier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PriceTier | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchTiers() {
    setLoading(true);
    try {
      const list = await sdk.priceTiers.list();
      setTiers(list);
    } catch {
      toast.error(t('failedLoadPriceTiers'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchTiers(); }, []);

  function handleSaved(saved: PriceTier) {
    setDrawerOpen(false);
    setTiers((prev) => {
      const idx = prev.findIndex((t_tier) => t_tier.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sdk.priceTiers.remove(deleteTarget.id);
      toast.success(t('priceTierDeleted'));
      setDeleteTarget(null);
      setTiers((prev) => prev.filter((t_tier) => t_tier.id !== deleteTarget.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t('cannotDeleteTierInUse'));
      } else {
        toast.error(t('failedDeletePriceTier'));
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('priceTiers')}
        description={t('managePriceTiersDesc')}
        breadcrumb={['Shop', t('priceTiers')]}
        actions={
          <button
            type="button"
            onClick={() => { setEditing(null); setDrawerOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('newTier')}
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">{t('loading')}</div>
      ) : tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <p className="text-sm">{t('noPriceTiersYet')}</p>
          <button
            type="button"
            onClick={() => { setEditing(null); setDrawerOpen(true); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t('createFirstTier')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tier.name}</span>
                    {tier.isDefault && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Star className="h-3 w-3" /> {t('default')}
                      </span>
                    )}
                  </div>
                  <KindBadge kind={tier.kind} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setEditing(tier); setDrawerOpen(true); }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title={t('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(tier)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title={t('delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Link
                to={`/price-tiers/${tier.id}`}
                className="mt-auto inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t('managePrices')}
              </Link>
            </Card>
          ))}
        </div>
      )}

      <TierDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onSaved={handleSaved}
      />

      <DeleteDialog
        tier={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}
