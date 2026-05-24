import {
  AlertTriangle,
  BarChart3,
  Beer,
  Box,
  Calendar,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, FormattedDate, Skeleton } from '@/ui';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useI18n } from '@/lib/i18n';
import { sdk } from '@/lib/sdk';
import { useAuthContext } from '@/lib/auth-context';
import type { DashboardData, DashboardRange, AdminDashboardData } from '@/sdk';
import { formatMoneyCents } from '@/utils/money';

// ─── Super Admin Dashboard ───────────────────────────────────────────────────

function SuperAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    sdk.admin.getDashboard()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e.message || 'Failed to load platform dashboard');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Platform Analytics"
          description="System-wide performance, health and audit logs"
          breadcrumb={['Platform', 'Dashboard']}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Analytics"
        description="System-wide performance, health and audit logs"
        breadcrumb={['Platform', 'Dashboard']}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Shops"
          value={(d?.totalShops ?? 0).toLocaleString()}
          icon={ShoppingCart}
          hint="Active on platform"
        />
        <StatCard
          label="Platform Volume"
          value={formatMoneyCents(d?.totalSalesAmount ?? 0)}
          icon={DollarSign}
          hint="Gross revenue"
        />
        <StatCard
          label="Total Users"
          value={(d?.totalUsers ?? 0).toLocaleString()}
          icon={Users}
          hint="Registered accounts"
        />
        <StatCard
          label="Stock Alert Stores"
          value={(d?.lowStockShopsCount ?? 0).toLocaleString()}
          icon={AlertTriangle}
          hint="Stores with low stocks"
        />
      </div>

      {/* Analytics sub-grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Performing Shops */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h3 className="font-semibold">Top Performing Shops</h3>
            </div>
            <div className="space-y-4">
              {d?.topShops?.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Rank #{idx + 1}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-500">
                    {formatMoneyCents(s.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Top Beverages Platform-wide */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Beer className="h-4 w-4" />
              </span>
              <h3 className="font-semibold">Global Best Sellers</h3>
            </div>
            <div className="space-y-4">
              {d?.topBeverages?.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Product Rank #{idx + 1}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {b.totalBoxes.toLocaleString()} boxes
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Live Platform Activity Feed */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <BarChart3 className="h-4 w-4" />
              </span>
              <h3 className="font-semibold">Platform Activity</h3>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {d?.recentActivities?.map((act) => (
                <div key={act.id} className="text-xs flex flex-col gap-0.5 border-b border-border/40 pb-2 last:border-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground/80">{act.actor}</span>
                    <span className="text-muted-foreground text-[10px]">{act.when}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{act.action}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Range selector ────────────────────────────────────────────────────────────

const RANGE_VALUES: DashboardRange[] = ['today', 'week', 'month'];

function RangeSelector({
  value,
  onChange,
}: {
  value: DashboardRange;
  onChange: (r: DashboardRange) => void;
}) {
  const { t } = useI18n();
  const labels: Record<DashboardRange, string> = {
    today: t('today'),
    week: t('week'),
    month: t('month'),
  };
  return (
    <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
      {RANGE_VALUES.map((rv) => (
        <button
          key={rv}
          type="button"
          onClick={() => onChange(rv)}
          className={
            rv === value
              ? 'rounded-md bg-background px-3 py-1 text-sm font-medium shadow-sm'
              : 'rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
          }
        >
          {labels[rv]}
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton helpers ──────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-3 w-20" />
    </Card>
  );
}

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-2.5">
          <Skeleton className="h-3.5 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Sub-sections ──────────────────────────────────────────────────────────────

function TopCustomers({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData['topCustomers'];
}) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">{t('topCustomers')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{t('customer')}</th>
              <th className="pb-2 text-right text-xs font-medium text-muted-foreground" colSpan={2}>{t('totalSales')}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={3} />)
              : data.length === 0
                ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        {t('noData')}
                      </td>
                    </tr>
                  )
                : data.map((c, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium">{c.name}</td>
                      <td className="py-2.5 text-right tabular-nums" colSpan={2}>
                        {formatMoneyCents(c.totalCents)}
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TopBeverages({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData['topBeverages'];
}) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">{t('topBeverages')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{t('beverage')}</th>
              <th className="pb-2 text-right text-xs font-medium text-muted-foreground">{t('boxesSold')}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={2} />)
              : data.length === 0
                ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                        {t('noData')}
                      </td>
                    </tr>
                  )
                : data.map((b, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium">{b.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{(b.totalBoxes ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LowStockAlert({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData['lowStockBeverages'];
}) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">{t('lowStockAlert')}</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t('allStockOk')}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((b, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
            >
              <span className="font-medium">{b.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {b.stockBottles} {t('bottles').toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentVoids({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData['recentVoids'];
}) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Package className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">{t('recentVoids')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{t('customer')}</th>
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{t('date')}</th>
              <th className="pb-2 text-right text-xs font-medium text-muted-foreground">{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={3} />)
              : data.length === 0
                ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        {t('noRecentVoids')}
                      </td>
                    </tr>
                  )
                : data.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium">{v.customerName ?? '—'}</td>
                      <td className="py-2.5 text-muted-foreground" colSpan={2}>
                        <FormattedDate iso={v.voidedAt} />
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Standard Dashboard ───────────────────────────────────────────────────────

function StandardDashboard() {
  const { t } = useI18n();
  const [range, setRange] = useState<DashboardRange>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    sdk.dashboard
      .getDashboard(range)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const d = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('dashboard')}
        description={t('overview')}
        breadcrumb={['Shop', t('dashboard')]}
        actions={<RangeSelector value={range} onChange={setRange} />}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label={`${t('sales')} — ${range === 'today' ? t('today') : range === 'week' ? t('week') : t('month')}`}
              value={formatMoneyCents(
                range === 'today' ? (d?.todaySalesCents ?? 0)
                  : range === 'week' ? (d?.weekSalesCents ?? 0)
                  : (d?.monthSalesCents ?? 0)
              )}
              icon={DollarSign}
              hint={range}
            />
            <StatCard
              label={t('outstandingCredit')}
              value={formatMoneyCents(d?.totalOutstandingCreditCents ?? 0)}
              icon={CreditCard}
              hint={`${d?.customersWithCreditCount ?? 0} ${t('customers').toLowerCase()}`}
            />
            <StatCard
              label={`${t('containersOut')} — ${t('boxes')}`}
              value={(d?.outstandingBoxes ?? 0).toLocaleString()}
              icon={Box}
              hint={t('containersOut')}
            />
            <StatCard
              label={`${t('containersOut')} — ${t('bottles')}`}
              value={(d?.outstandingBottles ?? 0).toLocaleString()}
              icon={Package}
              hint={t('containersOut')}
            />
            <StatCard
              label={t('lowStock')}
              value={(d?.lowStockBeverages?.length ?? 0).toLocaleString()}
              icon={AlertTriangle}
              hint={t('belowThreshold')}
            />
          </>
        )}
      </div>

      {/* Top Customers + Top Beverages */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopCustomers loading={loading} data={d?.topCustomers ?? []} />
        <TopBeverages loading={loading} data={d?.topBeverages ?? []} />
      </div>

      {/* Low Stock + Recent Voids */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LowStockAlert loading={loading} data={d?.lowStockBeverages ?? []} />
        <RecentVoids loading={loading} data={d?.recentVoids ?? []} />
      </div>

      {/* Range context note */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {t('salesKpiNote')}
      </div>
    </div>
  );
}

// ─── Main Default Export ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthContext();
  
  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  return <StandardDashboard />;
}
