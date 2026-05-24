import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { Beverage, PriceTier, TierPrice } from '@/sdk';
import { formatMoneyCents } from '@/utils/money';
import { useI18n } from '@/lib/i18n';

// ─── Inline price edit form ───────────────────────────────────────────────────

interface EditRowProps {
  tierId: string;
  beverageId: string;
  current: TierPrice | undefined;
  onSaved: (price: TierPrice) => void;
  onCancel: () => void;
}

function EditPriceRow({ tierId, beverageId, current, onSaved, onCancel }: EditRowProps) {
  const { t } = useI18n();
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
      toast.success(t('priceUpdated'));
      onSaved(saved);
    } catch {
      toast.error(t('failedUpdatePrice'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <tr className="border-b border-border bg-primary/5">
      <td className="px-4 py-3" colSpan={4}>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('perBox')}</label>
            <input
              value={boxCents}
              onChange={(e) => setBoxCents(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              required
              className={inputClass}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('perBottle')}</label>
            <input
              value={bottleCents}
              onChange={(e) => setBottleCents(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              required
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
              {saving ? t('saving') : t('save')}
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
              {t('cancel')}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

// ─── Price history sub-table ──────────────────────────────────────────────────

function PriceHistoryRow({ beverageId, tierId }: { beverageId: string; tierId: string }) {
  const { t } = useI18n();
  // The SDK only exposes current prices; history would come from a separate endpoint.
  // Show a placeholder indicating no history API is available yet.
  return (
    <tr className="border-b border-border bg-muted/30">
      <td className="px-6 py-3" colSpan={4}>
        <p className="text-xs text-muted-foreground italic">
          {t('priceHistoryNotAvailable')}
        </p>
      </td>
    </tr>
  );
}

// ─── Bulk Price Modal ─────────────────────────────────────────────────────────

interface BulkPriceModalProps {
  tierId: string;
  selectedIds: Set<string>;
  onClose: () => void;
  onSaved: (prices: TierPrice[]) => void;
}

function BulkPriceModal({ tierId, selectedIds, onClose, onSaved }: BulkPriceModalProps) {
  const { t } = useI18n();
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
      } catch {
        toast.error(`${t('failedUpdatePrice')} (${beverageId})`);
      }
      done += 1;
      setProgress(done);
    }
    if (saved.length > 0) {
      toast.success(`${t('updatedPricesFor')} ${saved.length} ${t('beveragesCount')}`);
      onSaved(saved);
    }
    setSaving(false);
  }

  const ic = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">{t('bulkSetPrice')}</h3>
        <p className="text-sm text-muted-foreground">{t('settingPriceFor')} {count} {count === 1 ? t('beverage') : t('beveragesCount')}</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('perBox')} *</label>
          <input value={boxVal} onChange={(e) => setBoxVal(e.target.value)} type="number" min={0} step="0.01" required className={ic} placeholder="0.00" autoFocus />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('perBottle')} *</label>
          <input value={bottleVal} onChange={(e) => setBottleVal(e.target.value)} type="number" min={0} step="0.01" required className={ic} placeholder="0.00" />
        </div>
        {saving && (
          <p className="text-sm text-muted-foreground">{progress} / {count} {t('saving')}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50">{t('cancel')}</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">{saving ? t('saving') : t('applyToAll')}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PriceRow {
  beverage: Beverage;
  price: TierPrice | undefined;
}

export default function PriceTierDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [tier, setTier] = useState<PriceTier | null>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingBeverageId, setEditingBeverageId] = useState<string | null>(null);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    async function load() {
      try {
        const [tierData, allBeverages, prices] = await Promise.all([
          sdk.priceTiers.findOne(id!),
          sdk.beverages.list({ pageSize: 200 }),
          sdk.priceTiers.getPrices(id!),
        ]);
        setTier(tierData);
        const priceMap = new Map(prices.map((p) => [p.beverageId, p]));
        setRows(
          allBeverages.data.map((b) => ({
            beverage: b,
            price: priceMap.get(b.id),
          })),
        );
      } catch {
        toast.error(t('failedLoadTierDetails'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, t]);

  function handlePriceSaved(saved: TierPrice) {
    setEditingBeverageId(null);
    setRows((prev) =>
      prev.map((r) => (r.beverage.id === saved.beverageId ? { ...r, price: saved } : r)),
    );
  }

  function handleBulkSaved(saved: TierPrice[]) {
    setBulkOpen(false);
    setSelected(new Set());
    setRows((prev) =>
      prev.map((r) => {
        const updated = saved.find((s) => s.beverageId === r.beverage.id);
        return updated ? { ...r, price: updated } : r;
      }),
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.beverage.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.beverage.id)));
    }
  }

  function toggleOne(beverageId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(beverageId)) {
        next.delete(beverageId);
      } else {
        next.add(beverageId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t('loading')}
      </div>
    );
  }

  if (!tier) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t('priceTierNotFound')}</p>
        <Link to="/price-tiers" className="text-sm text-primary hover:underline">
          {t('backToPriceTiers')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tier.name}
        description={`${t('managePricesForTier')} · ${t(tier.kind.toLowerCase() as any)}`}
        breadcrumb={['Shop', t('priceTiers'), tier.name]}
        actions={
          <Link
            to="/price-tiers"
            className="rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-accent"
          >
            {t('allTiers')}
          </Link>
        }
      />

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} {selected.size === 1 ? t('beverage') : t('beveragesCount')} {t('selected')}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent">{t('clear')}</button>
            <button type="button" onClick={() => setBulkOpen(true)} className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t('setPriceForSelected')}</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 font-medium">{t('beverages')}</th>
                <th className="px-4 py-3 font-medium">{t('perBox')}</th>
                <th className="px-4 py-3 font-medium">{t('perBottle')}</th>
                <th className="px-4 py-3 font-medium w-36">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {t('noBeveragesFound')}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <Fragment key={row.beverage.id}>
                  <tr
                    className={`border-b border-border last:border-0 hover:bg-accent/40 ${selected.has(row.beverage.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.beverage.id)}
                        onChange={() => toggleOne(row.beverage.id)}
                        className="h-4 w-4 rounded border-border"
                        aria-label={`Select ${row.beverage.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div>{row.beverage.name}</div>
                      {row.beverage.brand && (
                        <div className="text-xs text-muted-foreground">{row.beverage.brand}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.price ? (
                        <span>{formatMoneyCents(row.price.pricePerBoxCents)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">{t('notSet')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.price ? (
                        <span>{formatMoneyCents(row.price.pricePerBottleCents)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">{t('notSet')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingBeverageId((prev) =>
                              prev === row.beverage.id ? null : row.beverage.id,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title={t('editPrices') as string}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="text-xs">{t('edit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryOpenId((prev) =>
                              prev === row.beverage.id ? null : row.beverage.id,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Toggle price history"
                        >
                          {historyOpenId === row.beverage.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="text-xs">{t('history')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {editingBeverageId === row.beverage.id && id && (
                    <EditPriceRow
                      tierId={id}
                      beverageId={row.beverage.id}
                      current={row.price}
                      onSaved={handlePriceSaved}
                      onCancel={() => setEditingBeverageId(null)}
                    />
                  )}

                  {historyOpenId === row.beverage.id && id && (
                    <PriceHistoryRow
                      beverageId={row.beverage.id}
                      tierId={id}
                    />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bulkOpen && id && (
        <BulkPriceModal
          tierId={id}
          selectedIds={selected}
          onClose={() => setBulkOpen(false)}
          onSaved={handleBulkSaved}
        />
      )}
    </div>
  );
}
