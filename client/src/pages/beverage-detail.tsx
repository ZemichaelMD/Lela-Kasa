import {
  ArrowLeft,
  Box,
  Package,
  Pencil,
  Plus,
  TrendingDown,
  Wine,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { sdk } from '@/lib/sdk';
import type { Beverage, CurrentTierPrice, StockMovement } from '@/sdk';
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from '@/ui';
import { formatMoneyCents } from '@/utils/money';
import { useI18n } from '@/lib/i18n';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockLabel(beverage: Beverage, t: (key: any) => string): string {
  const boxes = Math.floor(beverage.stockBottles / beverage.bottlesPerBox);
  const bottles = beverage.stockBottles % beverage.bottlesPerBox;
  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes} ${boxes === 1 ? t('box') : t('boxesCount')}`);
  if (bottles > 0 || parts.length === 0) parts.push(`${bottles} ${bottles === 1 ? t('bottle') : t('bottlesCount')}`);
  return parts.join(' + ');
}


// ─── Add/Adjust Stock Modal ────────────────────────────────────────────────────

function StockModal({ beverage, onClose, onAdjusted }: { beverage: Beverage; onClose: () => void; onAdjusted: (b: Beverage) => void }) {
  const { t } = useI18n();
  const [boxes, setBoxes] = useState('');
  const [bottles, setBottles] = useState('');
  const [reason, setReason] = useState('PURCHASE');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const bxNum = parseInt(boxes, 10) || 0;
  const btlNum = parseInt(bottles, 10) || 0;
  const delta = bxNum * beverage.bottlesPerBox + btlNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (delta === 0) { toast.error(t('enterAtLeastOne')); return; }
    setSaving(true);
    try {
      const updated = await sdk.beverages.adjustStock(beverage.id, { bottlesDelta: delta, reason, notes: notes.trim() || undefined });
      toast.success(t('stockUpdated'));
      onAdjusted(updated);
    } catch { toast.error(t('failedUpdateStock')); }
    finally { setSaving(false); }
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  const REASON_LABELS: Record<string, string> = {
    PURCHASE: t('purchase'),
    ADJUSTMENT: t('stockAdjustment'),
    RETURN: t('return'),
    SALE: t('sales'),
    SALE_VOID: t('return'), // Reusing return for voided sales
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">{t('adjustStock')} · {beverage.name}</h3>
        <p className="text-sm text-muted-foreground">{t('currentStock')}: {stockLabel(beverage, t)}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('boxes')}</label>
            <input value={boxes} onChange={(e) => setBoxes(e.target.value)} type="number" className={ic} placeholder="0" />
            <p className="text-xs text-muted-foreground">× {beverage.bottlesPerBox} {t('bottle')}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('extraBottles')}</label>
            <input value={bottles} onChange={(e) => setBottles(e.target.value)} type="number" className={ic} placeholder="0" />
          </div>
        </div>
        {delta !== 0 && <p className={`text-sm font-medium ${delta > 0 ? 'text-success' : 'text-destructive'}`}>{t('delta')}: {delta > 0 ? '+' : ''}{delta} {t('bottlesCount')}</p>}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('status')}</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={ic}>
            {['PURCHASE', 'ADJUSTMENT', 'RETURN'].map((r) => <option key={r} value={r}>{REASON_LABELS[r] || r}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('note')}</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={ic} placeholder={t('none') as string} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">{saving ? t('saving') : t('apply')}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Edit Beverage Modal ───────────────────────────────────────────────────────

function EditModal({ beverage, onClose, onSaved }: { beverage: Beverage; onClose: () => void; onSaved: (b: Beverage) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(beverage.name);
  const [brand, setBrand] = useState(beverage.brand ?? '');
  const [sizeMl, setSizeMl] = useState(beverage.sizeMl != null ? String(beverage.sizeMl) : '');
  const [bottlesPerBox, setBottlesPerBox] = useState(String(beverage.bottlesPerBox));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await sdk.beverages.update(beverage.id, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        sizeMl: sizeMl ? Number(sizeMl) : undefined,
        bottlesPerBox: Number(bottlesPerBox) || 1,
      });
      toast.success(t('beverageUpdated'));
      onSaved(updated);
    } catch { toast.error(t('failedSaveBeverage')); }
    finally { setSaving(false); }
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">{t('editBeverage')}</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('name')} *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={ic} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('brand')}</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className={ic} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('sizeMl')}</label>
            <input value={sizeMl} onChange={(e) => setSizeMl(e.target.value)} type="number" min={0} className={ic} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('bottlesPerBoxLabel')} *</label>
            <input value={bottlesPerBox} onChange={(e) => setBottlesPerBox(e.target.value)} type="number" min={1} required className={ic} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BeverageDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [beverage, setBeverage] = useState<Beverage | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [prices, setPrices] = useState<CurrentTierPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // History filters
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [histReason, setHistReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [bev, movs, prs] = await Promise.all([
        sdk.beverages.findOne(id),
        sdk.beverages.getMovements(id),
        sdk.beverages.getCurrentPrices(id),
      ]);
      setBeverage(bev);
      setMovements(movs);
      setPrices(prs);
    } catch { toast.error(t('beverageNotFound')); }
    finally { setLoading(false); }
  }, [id, t]);

  useEffect(() => { void load(); }, [load]);

  const filteredMovements = movements.filter((m) => {
    if (histReason && m.reason !== histReason) return false;
    const d = m.createdAt.slice(0, 10);
    if (histFrom && d < histFrom) return false;
    if (histTo && d > histTo) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!beverage) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/beverages')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('backToBeverages')}
        </button>
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('beverageNotFound')}</Card>
      </div>
    );
  }

  const isLow = beverage.stockBottles <= beverage.bottlesPerBox * 2;
  const boxes = Math.floor(beverage.stockBottles / beverage.bottlesPerBox);
  const looseBottles = beverage.stockBottles % beverage.bottlesPerBox;

  const REASON_LABELS: Record<string, string> = {
    PURCHASE: t('purchase'),
    ADJUSTMENT: t('stockAdjustment'),
    RETURN: t('return'),
    SALE: t('sales'),
    SALE_VOID: t('return'),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={beverage.name}
        description={[beverage.brand, beverage.sizeMl ? `${beverage.sizeMl}ml` : null].filter(Boolean).join(' · ') || t('noDescription')}
        breadcrumb={[t('shop'), t('beverages'), beverage.name]}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/beverages')} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
              <ArrowLeft className="h-4 w-4" /> {t('prev')}
            </button>
            <PermissionGate permission="beverages:edit">
              <button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
                <Pencil className="h-4 w-4" /> {t('edit')}
              </button>
            </PermissionGate>
            <PermissionGate permission="beverages:stock">
              <button type="button" onClick={() => setStockOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" /> {t('addStock')}
              </button>
            </PermissionGate>
          </div>
        }
      />

      {/* Stock widgets */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('totalStock')}</p>
              <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${isLow ? 'text-amber-600' : ''}`}>{stockLabel(beverage, t)}</p>
              {isLow && <p className="mt-1 flex items-center gap-1 text-xs text-amber-600"><TrendingDown className="h-3 w-3" /> {t('lowStock')}</p>}
            </div>
            <div className="rounded-lg bg-muted p-2"><Package className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('fullBoxes')}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{boxes}</p>
              <p className="mt-1 text-xs text-muted-foreground">{beverage.bottlesPerBox} {t('btlPerBox')}</p>
            </div>
            <div className="rounded-lg bg-muted p-2"><Box className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('looseBottles')}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{looseBottles}</p>
            </div>
            <div className="rounded-lg bg-muted p-2"><Wine className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
      </div>

      {/* Prices */}
      {prices.length > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('pricesByTier')}</p>
          <div className="divide-y divide-border">
            {prices.map(({ tier, currentPrice }) => (
              <div key={tier.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium">{tier.name}</span>
                {currentPrice ? (
                  <div className="text-right text-sm">
                    <span className="tabular-nums">{formatMoneyCents(currentPrice.pricePerBoxCents)}/{t('box')}</span>
                    <span className="ml-3 text-muted-foreground tabular-nums">{formatMoneyCents(currentPrice.pricePerBottleCents)}/{t('btl')}</span>
                  </div>
                ) : (
                  <span className="text-sm italic text-muted-foreground">{t('notSet')}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Movement history */}
      <Card className="p-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('stockMovementHistory')}</p>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('from')}</label>
            <EthiopianDateInput value={histFrom} onChange={setHistFrom} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('to')}</label>
            <EthiopianDateInput value={histTo} onChange={setHistTo} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('status')}</label>
            <select value={histReason} onChange={(e) => setHistReason(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
              <option value="">{t('all')}</option>
              {['PURCHASE', 'ADJUSTMENT', 'RETURN', 'SALE', 'SALE_VOID'].map(r => <option key={r} value={r}>{REASON_LABELS[r] || r}</option>)}
            </select>
          </div>
          {(histFrom || histTo || histReason) && (
            <button type="button" onClick={() => { setHistFrom(''); setHistTo(''); setHistReason(''); }} className="self-end rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">{t('clear')}</button>
          )}
        </div>

        {filteredMovements.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('noMovements')}</p>
        ) : (
          <div className="space-y-2">
            {filteredMovements.map((m) => {
              const abs = Math.abs(m.bottlesDelta);
              const bx = Math.floor(abs / beverage.bottlesPerBox);
              const bt = abs % beverage.bottlesPerBox;
              const parts: string[] = [];
              if (bx > 0) parts.push(`${bx} ${bx === 1 ? t('box') : t('boxesCount')}`);
              if (bt > 0 || parts.length === 0) parts.push(`${bt} ${bt === 1 ? t('bottle') : t('bottlesCount')}`);
              const label = `${m.bottlesDelta > 0 ? '+' : '−'}${parts.join(' + ')}`;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{REASON_LABELS[m.reason] || m.reason}</p>
                    <p className="text-xs text-muted-foreground"><FormattedDate iso={m.createdAt} />{m.notes && ` · ${m.notes}`}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${m.bottlesDelta > 0 ? 'text-success' : 'text-destructive'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {stockOpen && <StockModal beverage={beverage} onClose={() => setStockOpen(false)} onAdjusted={(b) => { setBeverage(b); setStockOpen(false); void load(); }} />}
      {editOpen && <EditModal beverage={beverage} onClose={() => setEditOpen(false)} onSaved={(b) => { setBeverage(b); setEditOpen(false); }} />}
    </div>
  );
}
