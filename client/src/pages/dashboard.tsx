import {
  AlertTriangle,
  Box,
  Calendar,
  CreditCard,
  DollarSign,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EthiopianDateInput, FormattedDate, Skeleton, useFormattedDate } from "@/ui";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { toEth, ethMonths } from "@/lib/ethiopian-date-utils";
import { sdk } from "@/lib/sdk";
import type { DashboardData } from "@/sdk";
import { formatMoneyCents } from "@/utils/money";

// ── Types ──────────────────────────────────────────────────────────────────────

type RangeMode = "today" | "week" | "month" | "custom";

interface SalesSummary {
  totalAmountCents: number;
  totalCount: number;
  byDay: Array<{ date: string; amountCents: number; count: number }>;
  byPriceTier: Array<{
    priceTierId: string;
    tierName: string;
    amountCents: number;
    count: number;
  }>;
}

// ── Palette ────────────────────────────────────────────────────────────────────

const BRAND = "#096136";
const PALETTE = ["#096136", "#237e56", "#349e6f", "#5bbd90", "#91d7b3", "#c2ead2"];

// ── Date helpers ───────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getRangeDates(mode: Exclude<RangeMode, "custom">): {
  dateFrom: string;
  dateTo: string;
} {
  const t = todayIso();
  if (mode === "today") return { dateFrom: t, dateTo: t };
  if (mode === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { dateFrom: d.toISOString().slice(0, 10), dateTo: t };
  }
  return { dateFrom: firstDayOfMonth(), dateTo: t };
}

// ── Range selector ─────────────────────────────────────────────────────────────

function RangeSelectorBar({
  mode,
  dateFrom,
  dateTo,
  onChange,
  onDateChange,
}: {
  mode: RangeMode;
  dateFrom: string;
  dateTo: string;
  onChange: (m: RangeMode) => void;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const presets: { id: RangeMode; label: string }[] = [
    { id: "today", label: t("today") },
    { id: "week", label: t("week") },
    { id: "month", label: t("month") },
    { id: "custom", label: t("custom") },
  ];
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={
              mode === p.id
                ? "rounded-md bg-background px-3 py-1 text-sm font-medium shadow-sm"
                : "rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">{t("from")}</span>
          <EthiopianDateInput
            value={dateFrom}
            onChange={(v) => onDateChange(v, dateTo)}
          />
          <span className="text-muted-foreground text-xs">{t("to")}</span>
          <EthiopianDateInput
            value={dateTo}
            onChange={(v) => onDateChange(dateFrom, v)}
          />
        </div>
      )}
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "primary",
  loading,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "primary" | "warning" | "danger" | "success";
  loading?: boolean;
  href?: string;
}) {
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    warning: { bg: "bg-warning/10", text: "text-warning" },
    danger: { bg: "bg-destructive/10", text: "text-destructive" },
    success: { bg: "bg-success/10", text: "text-success" },
  };
  const c = colorMap[color];

  if (loading) {
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

  const inner = (
    <Card className={`p-5 flex flex-col gap-3 ${href ? "hover:border-primary/40 transition-colors" : ""}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground leading-none">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg} ${c.text} shrink-0`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );

  return href ? (
    <Link to={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ── Sales trend chart ──────────────────────────────────────────────────────────

function SalesTrendChart({
  loading,
  data,
  title,
}: {
  loading: boolean;
  data: SalesSummary["byDay"];
  title: string;
}) {
  const { t, lang } = useI18n();
  const fmtDate = useFormattedDate();

  const fmtAxisTick = useMemo(
    () => (iso: string) => {
      const d = parseISO(iso);
      if (!isValid(d)) return iso;
      if (lang === "am") {
        const et = toEth(d);
        return `${et.Month}/${et.Day}`;
      }
      return format(d, "MMM d");
    },
    [lang],
  );

  const SalesTooltipContent = useMemo(
    () =>
      function SalesTooltip({
        active,
        payload,
        label,
      }: {
        active?: boolean;
        payload?: Array<{ dataKey: string; value: number; color: string }>;
        label?: string;
      }) {
        if (!active || !payload?.length) return null;
        return (
          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold mb-1">
              {label ? fmtDate(label) : ""}
            </p>
            {payload.map((p) => (
              <p key={p.dataKey} style={{ color: p.color }}>
                {p.dataKey === "amountCents"
                  ? formatMoneyCents(p.value)
                  : `${p.value} ${t("orders").toLowerCase()}`}
              </p>
            ))}
          </div>
        );
      },
    [fmtDate, t],
  );

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </Card>
    );
  }

  const chartData = data.map((d) => ({ ...d }));
  const total = data.reduce((s, d) => s + d.amountCents, 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </span>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {data.length > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatMoneyCents(total)}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          {t("noData")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
                <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtAxisTick}
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => {
                const birr = v / 100;
                return birr >= 1000 ? `${(birr / 1000).toFixed(0)}k` : String(Math.round(birr));
              }}
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<SalesTooltipContent />} />
            <Area
              type="monotone"
              dataKey="amountCents"
              stroke={BRAND}
              strokeWidth={2}
              fill="url(#salesGrad)"
              dot={data.length <= 14 ? { fill: BRAND, r: 3, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: BRAND, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// ── Top beverages donut ────────────────────────────────────────────────────────

function TopBeveragesChart({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData["topBeverages"];
}) {
  const { t } = useI18n();
  const total = data.reduce((s, b) => s + (b.totalBoxes ?? 0), 0);

  const PieTooltipContent = useMemo(
    () =>
      function PieTooltip({
        active,
        payload,
      }: {
        active?: boolean;
        payload?: Array<{ payload: { name: string; value: number } }>;
      }) {
        if (!active || !payload?.length) return null;
        const p = payload[0].payload;
        return (
          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold">{p.name}</p>
            <p className="text-muted-foreground">
              {p.value.toLocaleString()} {t("boxes").toLowerCase()}
            </p>
          </div>
        );
      },
    [t],
  );

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-[160px] w-full rounded-full mx-auto" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const pieData = data.map((b) => ({ id: b.id, name: b.name, value: b.totalBoxes ?? 0 }));

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Package className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-sm">{t("topBeverages")}</h3>
      </div>

      {pieData.length === 0 ? (
        <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
          {t("noData")}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-2">
            {pieData.map((d, i) => (
              <li key={d.id} className="flex items-center justify-between text-xs gap-2">
                <Link
                  to={`/beverages/${d.id}`}
                  className="flex items-center gap-1.5 min-w-0 group"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="truncate group-hover:text-primary transition-colors">
                    {d.name}
                  </span>
                </Link>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {d.value.toLocaleString()}
                  {total > 0 && (
                    <span className="opacity-60 ml-1">
                      ({Math.round((d.value / total) * 100)}%)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

// ── Top customers list ─────────────────────────────────────────────────────────

function TopCustomersList({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData["topCustomers"];
}) {
  const { t } = useI18n();
  const max = Math.max(...data.map((c) => c.totalCents), 1);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-sm">{t("topCustomers")}</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          {t("noData")}
        </div>
      ) : (
        <ol className="space-y-3">
          {data.map((c, i) => (
            <li key={c.id}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <Link
                    to={`/customers/${c.id}`}
                    className="text-sm font-medium truncate hover:text-primary transition-colors"
                  >
                    {c.name}
                  </Link>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                  {formatMoneyCents(c.totalCents)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${(c.totalCents / max) * 100}%`,
                    opacity: 0.5 + (1 - i / data.length) * 0.5,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

// ── Low stock widget ───────────────────────────────────────────────────────────

function LowStockWidget({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData["lowStockBeverages"];
}) {
  const { t } = useI18n();

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-sm">{t("lowStockAlert")}</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-success">
          <span>✓</span> {t("allStockOk")}
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((b, i) => {
            const pct = Math.min(100, Math.round((b.stockBottles / 60) * 100));
            const isCritical = b.stockBottles <= 12;
            return (
              <li key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate mr-2">{b.name}</span>
                  <span
                    className={`tabular-nums shrink-0 ${
                      isCritical ? "text-destructive font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {b.stockBottles} {t("bottles").toLowerCase()}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCritical ? "bg-destructive" : "bg-warning"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Recent voids ───────────────────────────────────────────────────────────────

function RecentVoidsWidget({
  loading,
  data,
}: {
  loading: boolean;
  data: DashboardData["recentVoids"];
}) {
  const { t } = useI18n();

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Package className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-sm">{t("recentVoids")}</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          {t("noRecentVoids")}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((v) => (
            <li key={v.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  {v.customerId ? (
                    <Link
                      to={`/customers/${v.customerId}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {v.customerName ?? "·"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{v.customerName ?? "·"}</span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {t("salesDate")}:{" "}
                      <FormattedDate iso={v.saleDate} showTime />
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("voidedAt")}:{" "}
                    <FormattedDate iso={v.voidedAt} showTime />
                  </div>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoneyCents(v.subtotalCents)}
                  </p>
                  <Link
                    to={`/sales/${v.id}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    #{v.id.slice(-6)}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<RangeMode>("month");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayIso);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [summaryData, setSummaryData] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const didRecalcRef = useRef(false);

  // Fetch main dashboard data once
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      if (!didRecalcRef.current) {
        didRecalcRef.current = true;
        try {
          await sdk.customers.recalculateAll();
        } catch {
          /* non-fatal */
        }
      }
      try {
        const d = await sdk.dashboard.getDashboard("month");
        if (!cancelled) {
          setDashData(d);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync dates when preset mode changes
  useEffect(() => {
    if (mode !== "custom") {
      const { dateFrom: f, dateTo: t } = getRangeDates(mode);
      setDateFrom(f);
      setDateTo(t);
    }
  }, [mode]);

  // Fetch trend (sales by day) whenever date range changes
  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    let cancelled = false;
    setTrendLoading(true);

    void (async () => {
      try {
        const d = (await sdk.reports.salesSummary({ dateFrom, dateTo })) as SalesSummary;
        if (!cancelled) {
          setSummaryData(d);
          setTrendLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSummaryData(null);
          setTrendLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const salesValue =
    mode === "custom"
      ? (summaryData?.totalAmountCents ?? 0)
      : mode === "today"
        ? (dashData?.todaySalesCents ?? 0)
        : mode === "week"
          ? (dashData?.weekSalesCents ?? 0)
          : (dashData?.monthSalesCents ?? 0);

  const trendLabel =
    mode === "today"
      ? t("today")
      : mode === "week"
        ? t("week")
        : mode === "month"
          ? t("month")
          : `${dateFrom} – ${dateTo}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard")}
        description={t("overview")}
        breadcrumb={["Shop", t("dashboard")]}
        actions={
          <RangeSelectorBar
            mode={mode}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={setMode}
            onDateChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`${t("totalSales")} · ${trendLabel}`}
          value={formatMoneyCents(salesValue)}
          sub={
            mode === "custom" && summaryData
              ? `${summaryData.totalCount} ${t("orders").toLowerCase()}`
              : undefined
          }
          icon={DollarSign}
          color="primary"
          loading={loading || (mode === "custom" && trendLoading)}
          href="/sales"
        />
        <KpiCard
          label={t("outstandingCredit")}
          value={formatMoneyCents(dashData?.totalOutstandingCreditCents ?? 0)}
          sub={`${dashData?.customersWithCreditCount ?? 0} ${t("customersWithCredit")}`}
          icon={CreditCard}
          color="warning"
          loading={loading}
        />
        <KpiCard
          label={t("containersOut")}
          value={(dashData?.outstandingBoxes ?? 0).toLocaleString()}
          sub={`${(dashData?.outstandingBottles ?? 0).toLocaleString()} ${t("bottles").toLowerCase()}`}
          icon={Box}
          color="primary"
          loading={loading}
        />
        <KpiCard
          label={t("lowStockAlert")}
          value={(dashData?.lowStockBeverages?.length ?? 0).toLocaleString()}
          sub={t("belowThreshold")}
          icon={AlertTriangle}
          color={(dashData?.lowStockBeverages?.length ?? 0) > 0 ? "danger" : "success"}
          loading={loading}
        />
      </div>

      {/* Sales trend + Beverages donut */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesTrendChart
            loading={trendLoading}
            data={summaryData?.byDay ?? []}
            title={`${t("salesTrend")} · ${trendLabel}`}
          />
        </div>
        <TopBeveragesChart loading={loading} data={dashData?.topBeverages ?? []} />
      </div>

      {/* Top customers + Low stock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopCustomersList loading={loading} data={dashData?.topCustomers ?? []} />
        <LowStockWidget loading={loading} data={dashData?.lowStockBeverages ?? []} />
      </div>

      {/* Recent voids */}
      <RecentVoidsWidget loading={loading} data={dashData?.recentVoids ?? []} />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {t("salesKpiNote")}
      </div>
    </div>
  );
}
