import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Banknote, Coins, Building2, LogOut, ShoppingCart } from 'lucide-react';
import { API_URL, tokenStore } from '@/lib/sdk';
import { Card, Skeleton } from '@/ui';
import { formatMoneyCents } from '@/utils/money';
import { LangToggle } from '@/components/lang-toggle';
import { useI18n } from '@/lib/i18n';

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { customerId } = useParams<{ customerId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    const token = tokenStore.getAccessToken();
    if (!token) { setError(t('noAccessToken')); setLoading(false); return; }
    fetch(`${API_URL}/api/v1/customer-portal/${customerId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(async r => {
        const body = await r.json();
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(body)}`);
        const d = body?.data ?? body;
        if (!d?.customer) throw new Error(t('notFound'));
        setData(d);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [customerId, t]);

  function handleLogout() {
    tokenStore.clearTokens();
    window.location.href = '/customer-login';
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-lg px-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center gap-3">
        <p className="text-sm text-destructive font-medium">{t('errorLoading')}</p>
        <p className="text-sm text-muted-foreground max-w-md">{error || t('notFound')}</p>
        <button type="button" onClick={() => window.location.href = '/customer-login'} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{t('backToLogin')}</button>
      </div>
    );
  }

  const { customer, ledger } = data;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{customer.shop?.name ?? 'Shop'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(`/customer-portal/${customerId}/order`)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <ShoppingCart className="h-3.5 w-3.5" /> {t('newOrder')}
            </button>
            <LangToggle />
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('welcome')}, {customer.name}</h1>
          {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('creditBalance')}</p>
                <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${customer.creditBalanceCents > 0 ? 'text-destructive' : ''}`}>{formatMoneyCents(customer.creditBalanceCents)}</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Banknote className="h-4 w-4 text-muted-foreground" /></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('boxesOwned')}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">{customer.outstandingBoxes}</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Banknote className="h-4 w-4 text-muted-foreground" /></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('bottlesOwned')}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">{customer.outstandingBottles}</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Banknote className="h-4 w-4 text-muted-foreground" /></div>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">{t('recentActivity')}</h2>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noActivity')}</p>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry: any, i: number) => {
                const isPayment = entry.type === 'payment';
                const Icon = isPayment ? Coins : Banknote;
                const toneClass = isPayment ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary';
                return (
                  <div key={`${entry.type}-${entry.id}-${i}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className={`rounded-lg p-2 mt-0.5 ${toneClass}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{entry.type === 'payment' ? t('payment') : t('sale')}</p>
                      <p className="text-xs text-muted-foreground">{fmt(entry.date)}</p>
                      {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {!isPayment && <p className={`text-sm font-semibold tabular-nums ${entry.status === 'CONFIRMED' ? 'text-destructive' : ''}`}>{formatMoneyCents(entry.subtotalCents)}</p>}
                      {isPayment && <p className="text-sm font-semibold text-success tabular-nums">+{formatMoneyCents(entry.amountCents)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
