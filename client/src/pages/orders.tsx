import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PermissionGate } from "@/components/permission-gate";
import { API_URL, tokenStore } from "@/lib/sdk";
import { Card, FormattedDate, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await res.json();
  return envelope?.data ?? envelope;
}

async function apiPost(path: string, body?: unknown) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const envelope = await res.json();
  if (!res.ok) throw new Error(envelope?.error?.message ?? "Request failed");
  return envelope?.data ?? envelope;
}

const STATUS_TABS = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;

export default function OrdersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet(
        `/api/v1/orders/shop?status=${activeTab}&pageSize=50`,
      );
      setOrders(Array.isArray(data) ? data : (data?.data ?? []));
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [activeTab]);

  async function handleConfirm(id: string) {
    setConfirming(id);
    try {
      await apiPost(`/api/v1/orders/${id}/confirm`);
      toast.success(t("orderConfirmed"));
      void load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to confirm");
    } finally {
      setConfirming(null);
    }
  }

  async function handleReject(id: string) {
    try {
      await apiPost(`/api/v1/orders/${id}/reject`, {
        reason: rejectReason || undefined,
      });
      toast.success(t("orderRejected"));
      setRejectModal(null);
      setRejectReason("");
      void load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject");
    }
  }

  const pendingCount = orders.filter((o: any) => o.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("orders")}
        breadcrumb={["Shop", t("orders")]}
        description={pendingCount > 0 ? `${pendingCount} pending` : undefined}
      />

      <div className="flex gap-1 border-b border-border pb-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t((s.toLowerCase() + "Orders") as any)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {t("noOrders")}
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Card key={order.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {order.customer?.name ?? "·"}
                    </span>
                    <StatusBadge status={order.status} t={t} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <FormattedDate iso={order.createdAt} />
                  </p>
                </div>
                <span className="font-bold">
                  {formatMoneyCents(order.subtotalCents)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                {order.lines?.map((l: any, i: number) => (
                  <span key={i}>
                    {i > 0 && ", "}
                    {l.boxes} box + {l.bottles} btl {l.beverage?.name ?? "item"}
                  </span>
                ))}
              </div>

              {order.notes && (
                <p className="text-xs text-muted-foreground italic">
                  {order.notes}
                </p>
              )}

              {order.status === "PENDING" && (
                <div className="flex gap-2 pt-1">
                  <PermissionGate permission="orders:confirm">
                    <button
                      onClick={() => handleConfirm(order.id)}
                      disabled={confirming === order.id}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />{" "}
                      {confirming === order.id ? "..." : t("confirmOrder")}
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="orders:reject">
                    <button
                      onClick={() => {
                        setRejectModal(order.id);
                        setRejectReason("");
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" /> {t("rejectOrder")}
                    </button>
                  </PermissionGate>
                </div>
              )}

              {order.saleId && (
                <button
                  onClick={() => navigate(`/sales/${order.saleId}`)}
                  className="text-xs text-primary hover:underline"
                >
                  View Sale →
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg space-y-4">
            <h3 className="text-base font-semibold">{t("rejectOrder")}</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("rejectReason")}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                placeholder="Optional..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleReject(rejectModal)}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                {t("rejectOrder")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: any) => string }) {
  const color =
    status === "PENDING"
      ? "bg-amber-500/10 text-amber-600"
      : status === "CONFIRMED"
        ? "bg-success/10 text-success"
        : status === "REJECTED"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {t(`${status.toLowerCase()}`)}
    </span>
  );
}
