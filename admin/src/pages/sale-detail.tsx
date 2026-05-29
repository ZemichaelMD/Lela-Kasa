import { ArrowLeft, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { Beverage, Customer, PaymentAccount, Sale } from '@/sdk';
import { Card, FormattedDate, Skeleton } from '@/ui';
import { StatusChip } from '@/components/data-table';
import { formatMoneyCents } from '@/utils/money';
import { useI18n } from '@/lib/i18n';
import { useAuthContext } from '@/lib/auth-context';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string, locale = 'en-US'): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'OPEN') return 'warning';
  return 'neutral';
}

// ─── Void Dialog ──────────────────────────────────────────────────────────────

interface VoidDialogProps {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  voiding: boolean;
}

function VoidDialog({ open, onConfirm, onCancel, voiding }: VoidDialogProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t('voidQuestion')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('voidCannotUndone')}
        </p>
        <div className="mt-3 space-y-1.5">
          <label className="text-sm font-medium">{t('voidReason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            placeholder={t('enterReason') as string}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={voiding}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90"
          >
            {voiding ? t('voiding') : t('confirmVoid')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const { t, locale } = useI18n();
  const { user } = useAuthContext();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const data = isAdmin
          ? await sdk.admin.findOneSale(id!)
          : await sdk.sales.findOne(id!);
        setSale(data as unknown as Sale);
      } catch {
        toast.error(t('failedLoadSale'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, t, isAdmin]);

  async function handleVoid(reason: string) {
    if (!sale) return;
    setVoiding(true);
    try {
      await sdk.sales.void(sale.id, reason.trim() || '');
      toast.success(t('saleVoided'));
      setVoidOpen(false);
      // Reload
      const data = await sdk.sales.findOne(sale.id);
      setSale(data);
    } catch {
      toast.error(t('failedVoidSale'));
    } finally {
      setVoiding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToSales')}
        </button>
        <Card className="p-12 text-center text-muted-foreground">{t('saleNotFound')}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sale #${sale.id.slice(-6).toUpperCase()}`}
        description={`${t('status')}: ${sale.status}`}
        breadcrumb={[t('shop'), t('sales'), `#${sale.id.slice(-6).toUpperCase()}`]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> {t('prev')}
            </button>
            {sale.status !== 'VOID' && (
              <button
                type="button"
                onClick={() => setVoidOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
              >
                <Ban className="h-4 w-4" /> {t('voidSaleBtn')}
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Info & Items */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('saleInfo')}
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('customer')}</p>
                <p className="font-medium">{sale.customer?.name ?? t('walkIn')}</p>
                {sale.customer?.phone && <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('status')}</p>
                <StatusChip label={sale.status} tone={statusTone(sale.status)} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('saleDate')}</p>
                <p className="text-sm"><FormattedDate iso={sale.saleDate} /></p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('lastUpdated')}</p>
                <p className="text-sm">{formatDateTime(sale.updatedAt, locale)}</p>
              </div>
            </div>
            {sale.voidReason && (
              <div className="mt-6 rounded-lg bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-semibold">{t('voidReason')}</p>
                <p className="mt-0.5">{sale.voidReason}</p>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('items')}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-6 py-3">{t('beverage')}</th>
                    <th className="px-4 sm:px-6 py-3">{t('quantity')}</th>
                    <th className="px-4 sm:px-6 py-3">{t('unitPrice')}</th>
                    <th className="px-4 sm:px-6 py-3 text-right">{t('total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(sale.lines ?? []).map((item) => {
                    const qtyParts: string[] = [];
                    if (item.boxes > 0) qtyParts.push(`${item.boxes} ${item.boxes === 1 ? t('box') : t('boxesCount')}`);
                    if (item.bottles > 0) qtyParts.push(`${item.bottles} ${item.bottles === 1 ? t('bottle') : t('bottlesCount')}`);

                    return (
                      <tr key={item.id} className="hover:bg-accent/20">
                        <td className="px-4 sm:px-6 py-4">
                          <p className="font-medium">{item.beverage?.name ?? t('beverage')}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4 tabular-nums">{qtyParts.length > 0 ? qtyParts.join(' + ') : '—'}</td>
                        <td className="px-4 sm:px-6 py-4 tabular-nums">
                          {formatMoneyCents(item.pricePerBoxCents)}/{t('box')}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right font-medium tabular-nums">
                          {formatMoneyCents(item.lineTotalCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('payments')}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-6 py-3">{t('date')}</th>
                    <th className="px-4 sm:px-6 py-3">{t('paymentAccount')}</th>
                    <th className="px-4 sm:px-6 py-3 text-right">{t('amountPaid')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sale.payments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 sm:px-6 py-8 text-center text-muted-foreground italic">
                        {t('noPaymentsRecorded')}
                      </td>
                    </tr>
                  )}
                  {sale.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/20">
                      <td className="px-4 sm:px-6 py-4 text-muted-foreground"><FormattedDate iso={p.createdAt} /></td>
                      <td className="px-4 sm:px-6 py-4 font-medium">{p.paymentAccount?.name ?? t('other')}</td>
                      <td className="px-4 sm:px-6 py-4 text-right font-semibold text-success tabular-nums">
                        {formatMoneyCents(p.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {(sale.containerKasas?.length ?? 0) > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('containerKasaSection')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 sm:px-6 py-3">{t('beverage')}</th>
                      <th className="px-4 sm:px-6 py-3 text-right">{t('containerKasaCount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sale.containerKasas!.map((k) => (
                      <tr key={k.id} className="hover:bg-accent/20">
                        <td className="px-4 sm:px-6 py-4 font-medium">{k.beverage?.name ?? t('beverage')}</td>
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
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('returnedContainersSection')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 sm:px-6 py-3">{t('beverage')}</th>
                      <th className="px-4 sm:px-6 py-3">{t('returnBoxes')}</th>
                      <th className="px-4 sm:px-6 py-3 text-right">{t('returnBottles')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sale.returnedContainers!.map((r) => (
                      <tr key={r.id} className="hover:bg-accent/20">
                        <td className="px-4 sm:px-6 py-4 font-medium">{r.beverage?.name ?? t('beverage')}</td>
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

        {/* Right: Summary */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('summary')}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('totalAmount')}</span>
                <span className="font-semibold tabular-nums">{formatMoneyCents(sale.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('totalPaid')}</span>
                <span className="font-semibold text-success tabular-nums">{formatMoneyCents(sale.paidCents)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span>{t('remainingBalance')}</span>
                  <span className={sale.subtotalCents > sale.paidCents ? 'text-destructive tabular-nums' : 'tabular-nums'}>
                    {formatMoneyCents(sale.subtotalCents - sale.paidCents)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {sale.notes && (
            <Card className="p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('note')}
              </h3>
              <p className="text-sm text-muted-foreground">{sale.notes}</p>
            </Card>
          )}
        </div>
      </div>

      <VoidDialog
        open={voidOpen}
        onConfirm={handleVoid}
        onCancel={() => setVoidOpen(false)}
        voiding={voiding}
      />
    </div>
  );
}
