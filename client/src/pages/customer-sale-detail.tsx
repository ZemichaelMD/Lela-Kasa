import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL, tokenStore } from "@/lib/sdk";
import { Card, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await res.json();
  if (!res.ok) throw new Error(envelope?.error?.message ?? "Request failed");
  return envelope?.data ?? envelope;
}

function formatDateTime(iso: string, locale = "en-US"): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusChip(label: string) {
  const color =
    label === "CONFIRMED"
      ? "bg-success/10 text-success"
      : label === "OPEN"
        ? "bg-warning/10 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function CustomerSaleDetailPage() {
  const { t, locale } = useI18n();
  const { customerId, saleId } = useParams<{ customerId: string; saleId: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId || !saleId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(
          `/api/v1/customer-portal/${customerId}/sales/${saleId}`,
        );
        setSale(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load sale details");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [customerId, saleId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 text-center gap-3">
        <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{error ?? t("notFound")}</p>
        <button
          onClick={() => navigate(`/customer-portal/${customerId}`)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("backToLogin")}
        </button>
      </div>
    );
  }

  const back = () => navigate(`/customer-portal/${customerId}`);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={back} className="rounded p-1 text-muted-foreground hover:bg-accent">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              Sale #{sale.id.slice(-6).toUpperCase()}
            </span>
          </div>
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Sale info */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("saleInfo")}
            </h3>
            {statusChip(sale.status)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("saleDate")}</p>
              <p className="text-sm font-medium"><FormattedDate iso={sale.saleDate} /></p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("customer")}</p>
              <p className="text-sm font-medium">{sale.customer?.name}</p>
              {sale.customer?.phone && (
                <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("dateTime")}</p>
              <p className="text-sm">{formatDateTime(sale.createdAt, locale)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("lastUpdated")}</p>
              <p className="text-sm">{formatDateTime(sale.updatedAt, locale)}</p>
            </div>
          </div>
        </Card>

        {/* Items */}
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("items")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-6 py-3">{t("beverage")}</th>
                  <th className="px-4 sm:px-6 py-3">{t("quantity")}</th>
                  <th className="px-4 sm:px-6 py-3">{t("unitPrice")}</th>
                  <th className="px-4 sm:px-6 py-3 text-right">{t("total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(sale.lines ?? []).map((item: any) => {
                  const qtyParts: string[] = [];
                  if (item.boxes > 0)
                    qtyParts.push(`${item.boxes} ${item.boxes === 1 ? t("box") : t("boxesCount")}`);
                  if (item.bottles > 0)
                    qtyParts.push(`${item.bottles} ${item.bottles === 1 ? t("bottle") : t("bottlesCount")}`);
                  return (
                    <tr key={item.id} className="hover:bg-accent/20">
                      <td className="px-4 sm:px-6 py-4 font-medium">
                        {item.beverage?.name ?? t("beverage")}
                      </td>
                      <td className="px-4 sm:px-6 py-4 tabular-nums">
                        {qtyParts.length > 0 ? qtyParts.join(" + ") : "·"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 tabular-nums">
                        {formatMoneyCents(item.pricePerBoxCents)}/{t("box")}
                        {item.pricePerBottleCents > 0 && (
                          <> · {formatMoneyCents(item.pricePerBottleCents)}/{t("bottle")}</>
                        )}
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

        {/* Payments */}
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("payments")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-6 py-3">{t("date")}</th>
                  <th className="px-4 sm:px-6 py-3">{t("paymentAccount")}</th>
                  <th className="px-4 sm:px-6 py-3 text-right">{t("amountPaid")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sale.payments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 sm:px-6 py-8 text-center text-muted-foreground italic">
                      {t("noPaymentsRecorded")}
                    </td>
                  </tr>
                )}
                {sale.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-accent/20">
                    <td className="px-4 sm:px-6 py-4 text-muted-foreground">
                      <FormattedDate iso={p.paidAt} />
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-medium">
                      {p.paymentAccount?.name ?? t("other")}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right font-semibold text-success tabular-nums">
                      {formatMoneyCents(p.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Container Kasas */}
        {(sale.containerKasas?.length ?? 0) > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("containerKasaSection")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-6 py-3">{t("beverage")}</th>
                    <th className="px-4 sm:px-6 py-3 text-right">{t("containerKasaCount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sale.containerKasas!.map((k: any) => (
                    <tr key={k.id} className="hover:bg-accent/20">
                      <td className="px-4 sm:px-6 py-4 font-medium">
                        {k.beverage?.name ?? t("beverage")}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right tabular-nums">{k.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Returned Containers */}
        {(sale.returnedContainers?.length ?? 0) > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("returnedContainersSection")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-6 py-3">{t("beverage")}</th>
                    <th className="px-4 sm:px-6 py-3">{t("returnBoxes")}</th>
                    <th className="px-4 sm:px-6 py-3 text-right">{t("returnBottles")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sale.returnedContainers!.map((r: any) => (
                    <tr key={r.id} className="hover:bg-accent/20">
                      <td className="px-4 sm:px-6 py-4 font-medium">
                        {r.beverage?.name ?? t("beverage")}
                      </td>
                      <td className="px-4 sm:px-6 py-4 tabular-nums">{r.boxes}</td>
                      <td className="px-4 sm:px-6 py-4 text-right tabular-nums">{r.bottles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Summary */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            {t("summary")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("totalAmount")}</span>
              <span className="font-semibold tabular-nums">
                {formatMoneyCents(sale.subtotalCents)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("totalPaid")}</span>
              <span className="font-semibold text-success tabular-nums">
                {formatMoneyCents(sale.paidCents)}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>{t("remainingBalance")}</span>
                <span
                  className={
                    sale.subtotalCents > sale.paidCents
                      ? "text-destructive tabular-nums"
                      : "tabular-nums"
                  }
                >
                  {formatMoneyCents(sale.subtotalCents - sale.paidCents)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        {sale.notes && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("note")}
            </h3>
            <p className="text-sm text-muted-foreground">{sale.notes}</p>
          </Card>
        )}
      </main>
    </div>
  );
}
