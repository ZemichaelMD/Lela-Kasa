import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from "@/ui";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { sdk } from "@/lib/sdk";
import { API_URL } from "@/lib/sdk";
import { formatMoneyCents } from "@/utils/money";

// ─── Date helpers ──────────────────────────────────────────────────────────────

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Shared types ──────────────────────────────────────────────────────────────

type TabId =
  | "sales-summary"
  | "by-customer"
  | "by-beverage"
  | "by-payment-account"
  | "credit-aging"
  | "container-debt"
  | "stock-on-hand";

const TABS: { id: TabId; label: string }[] = [
  { id: "sales-summary", label: "Sales Summary" },
  { id: "by-customer", label: "By Customer" },
  { id: "by-beverage", label: "By Beverage" },
  { id: "by-payment-account", label: "By Payment Account" },
  { id: "credit-aging", label: "Credit Aging" },
  { id: "container-debt", label: "Container Debt" },
  { id: "stock-on-hand", label: "Stock On Hand" },
];

// Map tab → SDK endpoint path (for CSV export)
const TAB_PATH: Record<TabId, string> = {
  "sales-summary": "/api/v1/reports/sales-summary",
  "by-customer": "/api/v1/reports/sales-by-customer",
  "by-beverage": "/api/v1/reports/sales-by-beverage",
  "by-payment-account": "/api/v1/reports/sales-by-payment-account",
  "credit-aging": "/api/v1/reports/credit-aging",
  "container-debt": "/api/v1/reports/container-debt",
  "stock-on-hand": "/api/v1/reports/stock-on-hand",
};

// ─── Shared sub-components ─────────────────────────────────────────────────────

function DateRangeBar({
  dateFrom,
  dateTo,
  onChange,
  onExport,
  exporting,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted-foreground" htmlFor="date-from">
          {t('from')}
        </label>
        <EthiopianDateInput value={dateFrom} onChange={(v) => onChange(v, dateTo)} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted-foreground" htmlFor="date-to">
          {t('to')}
        </label>
        <EthiopianDateInput value={dateTo} onChange={(v) => onChange(dateFrom, v)} />
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {exporting ? t('exporting') : t('exportCsv')}
      </button>
    </div>
  );
}

function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-2.5">
              <Skeleton className="h-3.5 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  const { t } = useI18n();
  return (
    <tr>
      <td
        colSpan={cols}
        className="py-10 text-center text-sm text-muted-foreground"
      >
        {t('noDataPeriod')}
      </td>
    </tr>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      {children}
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/40 ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  muted,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2.5 text-sm ${right ? "text-right tabular-nums" : ""} ${muted ? "text-muted-foreground" : ""}`}
    >
      {children}
    </td>
  );
}

// ─── Sales Summary ─────────────────────────────────────────────────────────────

type SalesSummaryData = {
  totalCount: number;
  totalAmountCents: number;
  byDay: Array<{ date: string; count: number; amountCents: number }>;
  byPriceTier: Array<{ tierName: string; count: number; amountCents: number }>;
};

function SalesSummaryTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<SalesSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.reports
      .salesSummary({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setData(d as SalesSummaryData);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["sales-summary"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary numbers */}
      {!loading && data && (
        <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-muted/30 px-5 py-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t('totalSales')}</p>
            <p className="text-lg font-bold">
              {(data.totalCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('totalAmount')}</p>
            <p className="text-lg font-bold">
              {formatMoneyCents(data.totalAmountCents)}
            </p>
          </div>
        </div>
      )}

      {/* By day */}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('date')}</Th>
              <Th right>{t('count')}</Th>
              <Th right>{t('amount')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={3} />
          ) : (
            <tbody>
              {!data || data.byDay.length === 0 ? (
                <EmptyRow cols={3} />
              ) : (
                data.byDay.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td><FormattedDate iso={row.date} /></Td>
                    <Td right>{(row.count ?? 0).toLocaleString()}</Td>
                    <Td right>{formatMoneyCents(row.amountCents)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>

      {/* By price tier */}
      {!loading && data && data.byPriceTier.length > 0 && (
        <>
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('byPriceTier')}
          </h4>
          <TableWrapper>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <Th>{t('tier')}</Th>
                  <Th right>{t('count')}</Th>
                  <Th right>{t('amount')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.byPriceTier.map((row) => (
                  <tr
                    key={row.tierName}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td>{row.tierName}</Td>
                    <Td right>{(row.count ?? 0).toLocaleString()}</Td>
                    <Td right>{formatMoneyCents(row.amountCents)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        </>
      )}
    </div>
  );
}

// ─── By Customer ───────────────────────────────────────────────────────────────

type CustomerRow = {
  customerId: string;
  customerName: string;
  salesCount: number;
  subtotalCents: number;
  paidCents: number;
  creditCents: number;
  outstandingBoxes: number;
  outstandingBottles: number;
};

function ByCustomerTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.reports
      .salesByCustomer({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setRows((d as { rows: CustomerRow[] }).rows ?? (d as CustomerRow[]));
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["by-customer"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('customer')}</Th>
              <Th right>{t('sales')}</Th>
              <Th right>{t('subtotal')}</Th>
              <Th right>{t('paid')}</Th>
              <Th right>{t('credit')}</Th>
              <Th right>{t('boxesOut')}</Th>
              <Th right>{t('bottlesOut')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={7} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow cols={7} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.customerId}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td>{r.customerName}</Td>
                    <Td right>{(r.salesCount ?? 0).toLocaleString()}</Td>
                    <Td right>{formatMoneyCents(r.subtotalCents)}</Td>
                    <Td right>{formatMoneyCents(r.paidCents)}</Td>
                    <Td right>
                      <span
                        className={(r.creditCents ?? 0) > 0 ? "text-amber-600" : ""}
                      >
                        {formatMoneyCents(r.creditCents)}
                      </span>
                    </Td>
                    <Td right muted>
                      {(r.outstandingBoxes ?? 0).toLocaleString()}
                    </Td>
                    <Td right muted>
                      {(r.outstandingBottles ?? 0).toLocaleString()}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>
    </div>
  );
}

// ─── By Beverage ───────────────────────────────────────────────────────────────

type BeverageRow = {
  beverageId: string;
  beverageName: string;
  boxesSold: number;
  bottlesSold: number;
  totalAmountCents: number;
};

function ByBeverageTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<BeverageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.reports
      .salesByBeverage({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setRows((d as { rows: BeverageRow[] }).rows ?? (d as BeverageRow[]));
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["by-beverage"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('beverage')}</Th>
              <Th right>{t('boxesSold')}</Th>
              <Th right>{t('bottlesSold')}</Th>
              <Th right>{t('totalAmount')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={4} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow cols={4} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.beverageId}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td>{r.beverageName}</Td>
                    <Td right>{(r.boxesSold ?? 0).toLocaleString()}</Td>
                    <Td right>{(r.bottlesSold ?? 0).toLocaleString()}</Td>
                    <Td right>{formatMoneyCents(r.totalAmountCents)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>
    </div>
  );
}

// ─── By Payment Account ────────────────────────────────────────────────────────

type PaymentAccountRow = {
  accountId: string;
  accountName: string;
  kind: string;
  totalAmountCents: number;
  count: number;
};

function ByPaymentAccountTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<PaymentAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.reports
      .salesByPaymentAccount({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setRows(
            (d as { rows: PaymentAccountRow[] }).rows ??
              (d as PaymentAccountRow[]),
          );
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["by-payment-account"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('paymentAccount')}</Th>
              <Th>{t('kind')}</Th>
              <Th right>{t('totalAmount')}</Th>
              <Th right>{t('count')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={4} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow cols={4} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.accountId}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td>{r.accountName}</Td>
                    <Td muted>{r.kind}</Td>
                    <Td right>{formatMoneyCents(r.totalAmountCents)}</Td>
                    <Td right>{(r.count ?? 0).toLocaleString()}</Td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>
    </div>
  );
}

// ─── Credit Aging ──────────────────────────────────────────────────────────────

type CreditAgingRow = {
  customerId: string;
  customerName: string;
  creditBalanceCents: number;
  ageBucket: "0-30" | "31-60" | "61-90" | "90+";
};

const AGE_BUCKET_COLORS: Record<string, string> = {
  "0-30": "text-green-700 bg-green-500/10",
  "31-60": "text-amber-700 bg-amber-500/10",
  "61-90": "text-orange-700 bg-orange-500/10",
  "90+": "text-destructive bg-destructive/10",
};

function CreditAgingTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<CreditAgingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.reports
      .creditAging({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setRows(
            (d as { rows: CreditAgingRow[] }).rows ?? (d as CreditAgingRow[]),
          );
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["credit-aging"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('customer')}</Th>
              <Th right>{t('creditBalance')}</Th>
              <Th>{t('ageBucket')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={3} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow cols={3} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.customerId}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td>{r.customerName}</Td>
                    <Td right>
                      <span className="text-amber-600">
                        {formatMoneyCents(r.creditBalanceCents)}
                      </span>
                    </Td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${AGE_BUCKET_COLORS[r.ageBucket] ?? ""}`}
                      >
                        {r.ageBucket} {t('days').toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>
    </div>
  );
}

// ─── Container Debt ────────────────────────────────────────────────────────────

type ContainerDebtRow = {
  customerId: string;
  customerName: string;
  outstandingBoxes: number;
  outstandingBottles: number;
};

function ContainerDebtTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ContainerDebtRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    sdk.reports
      .containerDebt({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setRows(
            (d as { rows: ContainerDebtRow[] }).rows ??
              (d as ContainerDebtRow[]),
          );
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["container-debt"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('customer')}</Th>
              <Th right>{t('outstandingBoxes')}</Th>
              <Th right>{t('outstandingBottles')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={3} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow cols={3} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.customerId}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <Td>{r.customerName}</Td>
                    <Td right>{(r.outstandingBoxes ?? 0).toLocaleString()}</Td>
                    <Td right>{(r.outstandingBottles ?? 0).toLocaleString()}</Td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>
    </div>
  );
}

// ─── Stock On Hand ─────────────────────────────────────────────────────────────

type StockRow = {
  beverageId: string;
  beverageName: string;
  brand?: string | null;
  stockBoxes: number;
  stockBottles: number;
  isLowStock: boolean;
};

function StockOnHandTab({
  dateFrom,
  dateTo,
  onDateChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // stock-on-hand is a snapshot; date params sent for auth/context but ignored server-side
    sdk.reports
      .stockOnHand({ dateFrom, dateTo })
      .then((d) => {
        if (!cancelled) {
          setRows((d as { rows: StockRow[] }).rows ?? (d as StockRow[]));
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('failedLoad'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, t]);

  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams({ dateFrom, dateTo, format: "csv" });
    window.open(
      `${API_URL}${TAB_PATH["stock-on-hand"]}?${params.toString()}`,
      "_blank",
    );
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <div className="space-y-4">
      <DateRangeBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={onDateChange}
        onExport={handleExport}
        exporting={exporting}
      />
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <TableWrapper>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th>{t('beverage')}</Th>
              <Th>{t('brand')}</Th>
              <Th right>{t('stockBoxes')}</Th>
              <Th right>{t('stockBottles')}</Th>
              <Th>{t('lowStockQuestion')}</Th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={5} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <EmptyRow cols={5} />
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.beverageId}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 ${r.isLowStock ? "bg-destructive/5" : ""}`}
                  >
                    <Td>{r.beverageName}</Td>
                    <Td muted>{r.brand ?? "—"}</Td>
                    <Td right>{(r.stockBoxes ?? 0).toLocaleString()}</Td>
                    <Td right>{(r.stockBottles ?? 0).toLocaleString()}</Td>
                    <td className="px-4 py-2.5">
                      {r.isLowStock ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          {t('low')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700">
                          {t('ok')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </TableWrapper>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("sales-summary");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());

  function handleDateChange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
  }

  const tabList: { id: TabId; label: string }[] = [
    { id: "sales-summary", label: t('salesSummary') },
    { id: "by-customer", label: t('byCustomer') },
    { id: "by-beverage", label: t('byBeverage') },
    { id: "by-payment-account", label: t('byPaymentAccount') },
    { id: "credit-aging", label: t('creditAging') },
    { id: "container-debt", label: t('containerDebt') },
    { id: "stock-on-hand", label: t('stockOnHand') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports')}
        description={t('reportsDesc')}
        breadcrumb={["Shop", t('reports')]}
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {dateFrom} — {dateTo}
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              tab.id === activeTab
                ? "rounded-lg bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
                : "rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card className="p-5">
        {activeTab === "sales-summary" && (
          <SalesSummaryTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
        {activeTab === "by-customer" && (
          <ByCustomerTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
        {activeTab === "by-beverage" && (
          <ByBeverageTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
        {activeTab === "by-payment-account" && (
          <ByPaymentAccountTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
        {activeTab === "credit-aging" && (
          <CreditAgingTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
        {activeTab === "container-debt" && (
          <ContainerDebtTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
        {activeTab === "stock-on-hand" && (
          <StockOnHandTab dateFrom={dateFrom} dateTo={dateTo} onDateChange={handleDateChange} />
        )}
      </Card>
    </div>
  );
}
