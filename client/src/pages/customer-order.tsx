import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { API_URL, tokenStore } from "@/lib/sdk";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";
import { formatMoneyCents } from "@/utils/money";

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await res.json();
  return envelope?.data ?? envelope;
}

async function apiPost(path: string, body: unknown) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const envelope = await res.json();
  if (!res.ok) throw new Error(envelope?.error?.message ?? "Request failed");
  return envelope?.data ?? envelope;
}

export default function CustomerOrderPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [beverages, setBeverages] = useState<any[]>([]);
  const [prices, setPrices] = useState<
    Record<string, { box: number; bottle: number }>
  >({});
  const [lines, setLines] = useState<
    Array<{ beverageId: string; name: string; boxes: number; bottles: number }>
  >([]);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bevs, tiers] = await Promise.all([
          apiGet("/api/v1/beverages?pageSize=100&isActive=true"),
          apiGet("/api/v1/price-tiers"),
        ]);
        const tier = tiers?.find((t: any) => t.isDefault) ?? tiers?.[0];
        const priceMap: Record<string, { box: number; bottle: number }> = {};
        if (tier) {
          const tierPrices = await apiGet(
            `/api/v1/price-tiers/${tier.id}/prices`,
          );
          const pricesArr = Array.isArray(tierPrices)
            ? tierPrices
            : (tierPrices?.data ?? []);
          for (const p of pricesArr) {
            priceMap[p.beverageId] = {
              box: p.pricePerBoxCents,
              bottle: p.pricePerBottleCents,
            };
          }
        }
        setBeverages(
          Array.isArray(bevs?.data)
            ? bevs.data
            : Array.isArray(bevs)
              ? bevs
              : [],
        );
        setPrices(priceMap);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const subtotal = lines.reduce((sum, l) => {
    const p = prices[l.beverageId] ?? { box: 0, bottle: 0 };
    return sum + l.boxes * p.box + l.bottles * p.bottle;
  }, 0);

  function addLine(beverageId: string) {
    const bev = beverages.find((b) => b.id === beverageId);
    if (!bev) return;
    setLines((prev) => {
      if (prev.some((l) => l.beverageId === beverageId)) return prev;
      return [
        ...prev,
        { beverageId: bev.id, name: bev.name, boxes: 0, bottles: 0 },
      ];
    });
  }

  function updateLine(
    beverageId: string,
    field: "boxes" | "bottles",
    delta: number,
  ) {
    setLines((prev) =>
      prev.map((l) =>
        l.beverageId === beverageId
          ? { ...l, [field]: Math.max(0, l[field] + delta) }
          : l,
      ),
    );
  }

  function setLineValue(
    beverageId: string,
    field: "boxes" | "bottles",
    raw: string,
  ) {
    const val = parseInt(raw, 10);
    if (raw === "") {
      setLines((prev) =>
        prev.map((l) =>
          l.beverageId === beverageId ? { ...l, [field]: 0 } : l,
        ),
      );
      return;
    }
    if (isNaN(val) || val < 0) return;
    setLines((prev) =>
      prev.map((l) =>
        l.beverageId === beverageId ? { ...l, [field]: val } : l,
      ),
    );
  }

  function removeLine(beverageId: string) {
    setLines((prev) => prev.filter((l) => l.beverageId !== beverageId));
  }

  async function handlePlaceOrder() {
    const activeLines = lines.filter((l) => l.boxes > 0 || l.bottles > 0);
    if (activeLines.length === 0) {
      toast.error("Add at least one item with quantity");
      return;
    }
    setPlacing(true);
    try {
      await apiPost("/api/v1/orders", {
        customerId,
        lines: activeLines.map((l) => ({
          beverageId: l.beverageId,
          boxes: l.boxes,
          bottles: l.bottles,
        })),
        notes: notes.trim() || undefined,
      });
      toast.success(t("orderPlaced"));
      setPlaced(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 text-center">
        <ShoppingCart className="h-12 w-12 text-success mb-4" />
        <h1 className="text-xl font-bold">{t("orderPlaced")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("notifyOwner")}</p>
        <button
          onClick={() => navigate(`/customer-portal/${customerId}`)}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/customer-portal/${customerId}`)}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{t("newOrder")}</span>
          </div>
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {loading ? (
          <div className="text-sm text-muted-foreground">
            Loading beverages...
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((l) => {
              const p = prices[l.beverageId];
              return (
                <div
                  key={l.beverageId}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{l.name}</span>
                    <button
                      onClick={() => removeLine(l.beverageId)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {p && (
                    <p className="text-xs text-muted-foreground">
                      Box: {formatMoneyCents(p.box)} · Bottle:{" "}
                      {formatMoneyCents(p.bottle)}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateLine(l.beverageId, "boxes", -1)
                        }
                        className="rounded border border-border p-1 hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={l.boxes}
                        onChange={(e) =>
                          setLineValue(l.beverageId, "boxes", e.target.value)
                        }
                        className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateLine(l.beverageId, "boxes", 1)}
                        className="rounded border border-border p-1 hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="text-xs text-muted-foreground ml-1">
                        boxes
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateLine(l.beverageId, "bottles", -1)
                        }
                        className="rounded border border-border p-1 hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={l.bottles}
                        onChange={(e) =>
                          setLineValue(l.beverageId, "bottles", e.target.value)
                        }
                        className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateLine(l.beverageId, "bottles", 1)}
                        className="rounded border border-border p-1 hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="text-xs text-muted-foreground ml-1">
                        bottles
                      </span>
                    </div>
                  </div>
                  {p && (l.boxes > 0 || l.bottles > 0) && (
                    <p className="text-xs text-right font-medium">
                      {formatMoneyCents(
                        l.boxes * p.box + l.bottles * p.bottle,
                      )}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("selectBeverage")}
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) addLine(e.target.value);
                  e.target.value = "";
                }}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">· {t("selectBeverage")} ·</option>
                {beverages.map((b: any) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={lines.some((l) => l.beverageId === b.id)}
                  >
                    {b.name}
                    {b.brand ? ` (${b.brand})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("orderNotes")} ({t("optional")})
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <span className="font-medium">{t("orderTotal")}</span>
              <span className="text-lg font-bold">
                {formatMoneyCents(subtotal)}
              </span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing || lines.length === 0}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {placing ? "Placing..." : t("placeOrder")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
