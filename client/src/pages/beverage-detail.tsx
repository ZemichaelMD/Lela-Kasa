import {
  ArrowLeft,
  Box,
  Package,
  Pencil,
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
import { stockLabel, emptyStockLabel } from '@/lib/stock-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function movFullLabel(m: StockMovement, beverage: Beverage | null, t: (k: any) => string) {
  const abs = Math.abs(m.bottlesDelta);
  const bx = beverage ? Math.floor(abs / beverage.bottlesPerBox) : 0;
  const bt = beverage ? abs % beverage.bottlesPerBox : abs;
  const parts: string[] = [];
  if (bx > 0) parts.push(`${bx} ${t('boxes').toLowerCase()}`);
  if (bt > 0 || parts.length === 0) parts.push(`${bt} ${t('bottles').toLowerCase()}`);
  return `${m.bottlesDelta > 0 ? '+' : '-'}${parts.join(' + ')}`;
}

function movLabel(m: StockMovement, beverage: Beverage | null, t: (k: any) => string) {
  const parts: string[] = [];
  if (m.bottlesDelta && m.bottlesDelta !== 0) {
    parts.push(`${movFullLabel(m, beverage, t)} ${t('fullStock').toLowerCase()}`);
  }
  if (m.emptyBoxesDelta || m.emptyBottlesDelta) {
    const ebd = m.emptyBoxesDelta ?? 0;
    const ebtd = m.emptyBottlesDelta ?? 0;
    const sub: string[] = [];
    if (ebd !== 0) sub.push(`${Math.abs(ebd)} ${t('boxes').toLowerCase()}`);
    if (ebtd !== 0 || sub.length === 0) sub.push(`${Math.abs(ebtd)} ${t('bottles').toLowerCase()}`);
    const isPositive = (m.emptyBoxesDelta ?? 0) + (m.emptyBottlesDelta ?? 0) > 0;
    parts.push(`${isPositive ? '+' : '-'}${sub.join(' + ')} ${t('emptyStock').toLowerCase()}`);
  }
  return parts.join('  ·  ');
}

// ─── Inventory Modal (Adjust / Swap / History) ────────────────────────────────

type InvTab = 'adjust' | 'swap' | 'history';

function InventoryModal({ beverage, onClose, onAdjusted }: { beverage: Beverage; onClose: () => void; onAdjusted: (b: Beverage) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<InvTab>('adjust');

  // Adjust form
  const [fullBoxes, setFullBoxes] = useState('');
  const [fullBottles, setFullBottles] = useState('');
  const [isRemoveFull, setIsRemoveFull] = useState(false);
  const [emptyBoxes, setEmptyBoxes] = useState('');
  const [emptyBottles, setEmptyBottles] = useState('');
  const [reason, setReason] = useState('PURCHASE');
  const [notes, setNotes] = useState('');

  // Swap form
  const [swapBoxes, setSwapBoxes] = useState('');
  const [swapBottles, setSwapBottles] = useState('');

  const [saving, setSaving] = useState(false);

  // History
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movLoading, setMovLoading] = useState(false);
  const [histDateFrom, setHistDateFrom] = useState('');
  const [histDateTo, setHistDateTo] = useState('');
  const [histReason, setHistReason] = useState('');

  useEffect(() => {
    setTab('adjust');
    setFullBoxes(''); setFullBottles(''); setIsRemoveFull(false);
    setEmptyBoxes(''); setEmptyBottles('');
    setReason('PURCHASE'); setNotes('');
    setSwapBoxes(''); setSwapBottles('');
    setMovements([]); setHistDateFrom(''); setHistDateTo(''); setHistReason('');
  }, [beverage?.id]);

  useEffect(() => {
    if (tab === 'history') {
      setMovLoading(true);
      sdk.beverages.getMovements(beverage.id).then(setMovements).catch(() => toast.error(t('failedLoadHistory'))).finally(() => setMovLoading(false));
    }
  }, [tab, beverage.id, t]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    const fb = parseInt(fullBoxes, 10) || 0;
    const fbt = parseInt(fullBottles, 10) || 0;
    const eb = parseInt(emptyBoxes, 10) || 0;
    const ebt = parseInt(emptyBottles, 10) || 0;
    const fullDelta = (isRemoveFull ? -1 : 1) * (fb * beverage.bottlesPerBox + fbt);
    if (fullDelta === 0 && eb === 0 && ebt === 0) { toast.error(t('enterAtLeastOneFullOrEmpty')); return; }
    setSaving(true);
    try {
      const updated = await sdk.beverages.adjustInventory(beverage.id, {
        fullBottlesDelta: fullDelta !== 0 ? fullDelta : undefined,
        emptyBoxesDelta: eb > 0 ? eb : undefined,
        emptyBottlesDelta: ebt > 0 ? ebt : undefined,
        reason,
        notes: notes.trim() || undefined,
      });
      toast.success(t('inventoryAdjusted'));
      onAdjusted(updated);
      setFullBoxes(''); setFullBottles(''); setEmptyBoxes(''); setEmptyBottles('');
      setNotes(''); setIsRemoveFull(false);
    } catch { toast.error(t('inventoryAdjustFailed')); }
    finally { setSaving(false); }
  }

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault();
    const eb = parseInt(swapBoxes, 10) || 0;
    const ebt = parseInt(swapBottles, 10) || 0;
    if (eb === 0 && ebt === 0) { toast.error(t('enterAtLeastOneFullOrEmpty')); return; }
    if (eb > beverage.emptyBoxes || ebt > beverage.emptyBottles) { toast.error(t('notEnoughEmpties')); return; }
    setSaving(true);
    try {
      const updated = await sdk.beverages.swap(beverage.id, { emptyBoxes: eb, emptyBottles: ebt });
      toast.success(t('swapCompleted'));
      onAdjusted(updated);
      setSwapBoxes(''); setSwapBottles('');
    } catch { toast.error(t('swapFailed')); }
    finally { setSaving(false); }
  }

  const filteredMovements = movements.filter((m) => {
    if (histReason && m.reason !== histReason) return false;
    if (histDateFrom && m.createdAt < histDateFrom) return false;
    if (histDateTo && m.createdAt > histDateTo + 'T23:59:59') return false;
    return true;
  });

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  const REASONS = [
    { value: 'PURCHASE', label: t('purchase') },
    { value: 'ADJUSTMENT', label: t('stockAdjustment') },
    { value: 'RETURN', label: t('return') },
  ];
  const ALL_REASONS = [...REASONS, { value: 'SWAP', label: t('swap') }];

  const fullComputed = (isRemoveFull ? -1 : 1) * ((parseInt(fullBoxes, 10) || 0) * beverage.bottlesPerBox + (parseInt(fullBottles, 10) || 0));
  const swapReceiving = (parseInt(swapBoxes, 10) || 0) * beverage.bottlesPerBox + (parseInt(swapBottles, 10) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-card shadow-xl border border-border max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div>
            <h3 className="text-base font-semibold">{beverage.name}</h3>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{t('fullStock')}: {stockLabel(beverage, t)}</span>
              <span>{t('emptyStock')}: {emptyStockLabel(beverage, t)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>

        <div className="flex gap-1 border-b border-border bg-muted/30 px-4 pt-2 shrink-0">
          {(['adjust', 'swap', 'history'] as const).map((tt) => (
            <button key={tt} type="button" onClick={() => setTab(tt)} className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${tab === tt ? 'border border-b-0 border-border bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tt === 'adjust' ? t('addAdjust') : tt === 'swap' ? t('swap') : t('history')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'adjust' && (
            <form onSubmit={handleAdjust} className="space-y-5 px-5 py-5">
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-2 text-sm font-medium">{t('fullStockAdjustment')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('boxes')}</label>
                    <input value={fullBoxes} onChange={(e) => setFullBoxes(e.target.value)} type="number" min={0} className={ic} placeholder="0" />
                    <p className="text-xs text-muted-foreground">× {beverage.bottlesPerBox} {t('bottles').toLowerCase()} {t('each')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('extraBottles')}</label>
                    <input value={fullBottles} onChange={(e) => setFullBottles(e.target.value)} type="number" min={0} className={ic} placeholder="0" />
                  </div>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={isRemoveFull} onChange={(e) => setIsRemoveFull(e.target.checked)} className="rounded border-border" />
                  {t('removeFull')}
                </label>
                {fullComputed !== 0 && (
                  <p className={`mt-2 text-sm font-medium ${fullComputed > 0 ? 'text-success' : 'text-destructive'}`}>
                    {fullComputed > 0 ? '+' : ''}{fullComputed} {t('bottles').toLowerCase()} {t('fullStock').toLowerCase()}
                  </p>
                )}
              </fieldset>

              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-2 text-sm font-medium">{t('emptyStockAdjustment')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('emptyBoxes')}</label>
                    <input value={emptyBoxes} onChange={(e) => setEmptyBoxes(e.target.value)} type="number" min={0} className={ic} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('emptyBottles')}</label>
                    <input value={emptyBottles} onChange={(e) => setEmptyBottles(e.target.value)} type="number" min={0} className={ic} placeholder="0" />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('reason')}</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={ic}>
                  {REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
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
          )}

          {tab === 'swap' && (
            <form onSubmit={handleSwap} className="space-y-4 px-5 py-5">
              <p className="text-xs text-muted-foreground">{t('swapDescription')}</p>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{t('emptyStock')}: {emptyStockLabel(beverage, t)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('emptyBoxesToSwap')}</label>
                  <input value={swapBoxes} onChange={(e) => setSwapBoxes(e.target.value)} type="number" min={0} className={ic} placeholder="0" />
                  <p className="text-xs text-muted-foreground">× {beverage.bottlesPerBox} {t('bottles').toLowerCase()} {t('each')}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('emptyBottlesToSwap')}</label>
                  <input value={swapBottles} onChange={(e) => setSwapBottles(e.target.value)} type="number" min={0} className={ic} placeholder="0" />
                </div>
              </div>
              {swapReceiving > 0 && (
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">{t('fullBottlesReceived')}</p>
                  <p className="text-lg font-semibold text-success">+{swapReceiving} {t('bottles').toLowerCase()}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">{saving ? t('saving') : t('swap')}</button>
              </div>
            </form>
          )}

          {tab === 'history' && (
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('from')}</label>
                  <EthiopianDateInput value={histDateFrom} onChange={setHistDateFrom} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('to')}</label>
                  <EthiopianDateInput value={histDateTo} onChange={setHistDateTo} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('reason')}</label>
                <select value={histReason} onChange={(e) => setHistReason(e.target.value)} className={ic}>
                  <option value="">{t('allReasons')}</option>
                  {ALL_REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              {movLoading ? <p className="py-6 text-center text-sm text-muted-foreground">{t('loading')}</p>
              : filteredMovements.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t('noMovements')}</p>
              : (
                <div className="space-y-2">
                  {filteredMovements.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border bg-background px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{ALL_REASONS.find((r) => r.value === m.reason)?.label ?? m.reason}</span>
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
      </div>
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
            <input value={sizeMl} onChange={(e) => setSizeMl(e.target.value)} type="number" className={ic} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('bottlesPerBoxLabel')}</label>
            <input value={bottlesPerBox} onChange={(e) => setBottlesPerBox(e.target.value)} type="number" min={1} className={ic} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">{saving ? t('saving') : t('saveChanges')}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BeverageDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [beverage, setBeverage] = useState<Beverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<CurrentTierPrice[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [histReason, setHistReason] = useState('');
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [bev, pr, movs] = await Promise.all([
        sdk.beverages.findOne(id),
        sdk.beverages.getCurrentPrices(id),
        sdk.beverages.getMovements(id),
      ]);
      setBeverage(bev);
      setPrices(pr);
      setMovements(movs);
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
  const emptyBoxes = beverage.emptyBoxes ?? 0;

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
                <Package className="h-4 w-4" /> {t('editStock')}
              </button>
            </PermissionGate>
          </div>
        }
      />

      {/* Stock widgets */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('totalStock')}</p>
              <p className={`mt-1.5 text-xl font-semibold tabular-nums ${isLow ? 'text-amber-600' : ''}`}>{stockLabel(beverage, t)}</p>
              {isLow && <p className="mt-1 flex items-center gap-1 text-xs text-amber-600"><TrendingDown className="h-3 w-3" /> {t('lowStock')}</p>}
            </div>
            <div className="rounded-lg bg-muted p-2"><Package className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('fullBoxes')}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums">{boxes}</p>
              <p className="text-xs text-muted-foreground">{beverage.bottlesPerBox} {t('btlPerBox')}</p>
            </div>
            <div className="rounded-lg bg-muted p-2"><Box className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('looseBottles')}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums">{looseBottles}</p>
            </div>
            <div className="rounded-lg bg-muted p-2"><Wine className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('emptyBoxes')}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums">{emptyBoxes}</p>
            </div>
            <div className="rounded-lg bg-muted p-2"><Box className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('emptyBottles')}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums">{beverage.emptyBottles ?? 0}</p>
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
            <label className="text-xs text-muted-foreground">{t('reason')}</label>
            <select value={histReason} onChange={(e) => setHistReason(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
              <option value="">{t('allReasons')}</option>
              {['PURCHASE', 'ADJUSTMENT', 'RETURN', 'SALE', 'SALE_VOID', 'SWAP'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {(histFrom || histTo || histReason) && (
            <button type="button" onClick={() => { setHistFrom(''); setHistTo(''); setHistReason(''); }} className="self-end rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">{t('clear')}</button>
          )}
        </div>

        {filteredMovements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('noMovements')}</p>
        ) : (
          <div className="space-y-2">
            {filteredMovements.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-background px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.reason}</span>
                  <span className="text-xs text-muted-foreground"><FormattedDate iso={m.createdAt} /></span>
                </div>
                <p className="text-xs font-medium tabular-nums">{movLabel(m, beverage, t)}</p>
                {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {stockOpen && <InventoryModal beverage={beverage} onClose={() => setStockOpen(false)} onAdjusted={(b) => setBeverage(b)} />}
      {editOpen && <EditModal beverage={beverage} onClose={() => setEditOpen(false)} onSaved={(b) => setBeverage(b)} />}
    </div>
  );
}
