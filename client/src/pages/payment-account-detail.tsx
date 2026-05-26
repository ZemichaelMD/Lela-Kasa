import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { sdk } from "@/lib/sdk";
import type { Payment, PaymentAccount } from "@/sdk";
import { Card, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

export default function PaymentAccountDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const [accData, paymentsData] = await Promise.all([
          sdk.paymentAccounts.findOne(id!),
          sdk.paymentAccounts.getPayments(id!),
        ]);
        setAccount(accData);
        setPayments(paymentsData);
      } catch {
        toast.error(t("failedLoadPaymentAccountDetails"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, t]);

  const sortedPayments = [...payments].sort((a, b) => {
    const aDate = new Date(a.createdAt).getTime();
    const bDate = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/payment-accounts")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToPaymentAccounts")}
        </button>
        <Card className="p-12 text-center text-muted-foreground">
          {t("paymentAccountNotFound")}
        </Card>
      </div>
    );
  }

  const totalAmount = sortedPayments.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        breadcrumb={[t("shop"), t("paymentAccounts"), account.name]}
        actions={
          <button
            type="button"
            onClick={() => navigate("/payment-accounts")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </button>
        }
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {t("totalPayments")}
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatMoneyCents(totalAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {sortedPayments.length} {t("transactions")}
          </p>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-6 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("payments")}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("sortBy")}:
            </span>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
            >
              {sortOrder === "desc" ? t("newest") : t("oldest")}
            </button>
          </div>
        </div>
        {sortedPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("noPaymentsRecorded")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">{t("date")}</th>
                  <th className="px-6 py-3">{t("amount")}</th>
                  <th className="px-6 py-3">{t("method")}</th>
                  <th className="px-6 py-3">{t("reference")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/20">
                    <td className="px-6 py-4">
                      <FormattedDate
                        iso={p.createdAt}
                        className="text-xs text-muted-foreground mt-0.5"
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold text-success tabular-nums">
                      {formatMoneyCents(p.amountCents)}
                    </td>
                    <td className="px-6 py-4">{p.method || t("other")}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {p.reference || "·"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
