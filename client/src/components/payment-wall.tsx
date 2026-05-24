import { useEffect, useState } from "react";
import {
  Bell,
  CreditCard,
  Crown,
  Check,
  Building2,
  Loader,
  RefreshCw,
  LogOut,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { API_URL, tokenStore } from "@/lib/sdk";
import { Card } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { LangToggle } from "@/components/lang-toggle";
import { FileSelector } from "@/components/file-selector";

interface SupportInfo {
  phone: string;
  email: string;
  telegram: string;
  whatsapp: string;
  hours: string;
  url: string;
  message: string;
}

function handleLogout() {
  void tokenStore.clearTokens();
  window.location.href = "/login";
}

/** Refresh + sign-out actions and the support contact info, shown on the paywall screens. */
function PaywallActions({ support }: { support: SupportInfo | null }) {
  return (
    <div className="space-y-3 pt-1">
      {support && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
          <p className="font-medium text-foreground">Contact Admin</p>
          <div className="space-y-1.5">
            {support.phone && (
              <a href={`tel:${support.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-3.5 w-3.5" /> {support.phone}
              </a>
            )}
            {support.email && (
              <a href={`mailto:${support.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-3.5 w-3.5" /> {support.email}
              </a>
            )}
            {support.telegram && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> Telegram: {support.telegram}
              </span>
            )}
            {support.whatsapp && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {support.whatsapp}
              </span>
            )}
            {support.hours && (
              <p className="text-muted-foreground/70">{support.hours}</p>
            )}
          </div>
          {support.message && (
            <p className="text-muted-foreground/70 italic">{support.message}</p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  trialDays: number;
  features:
    | Array<{ text: string; included: boolean }>
    | Record<string, boolean>;
  maxShops: number;
  maxUsers: number;
  maxCustomers: number;
}

interface Provider {
  id: string;
  name: string;
  kind: string;
  instructions: string | null;
  contactInfo: string | null;
}

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const envelope = await res.json();
  return envelope?.data ?? envelope;
}

function getDisplayFeatures(features: any): string[] {
  if (Array.isArray(features)) {
    return features.filter((f: any) => f.included).map((f: any) => f.text);
  }
  if (typeof features === "object" && features !== null) {
    return Object.entries(features)
      .filter(([, v]) => v)
      .map(([k]) =>
        k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      );
  }
  return [];
}

export default function PaymentWall() {
  const [step, setStep] = useState<
    "loading" | "pending" | "plans" | "providers"
  >("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [support, setSupport] = useState<SupportInfo | null>(null);
  const [remindCooldownUntil, setRemindCooldownUntil] = useState<number>(() => {
    const stored = Number(localStorage.getItem("kasa_remind_until") || 0);
    return stored > Date.now() ? stored : 0;
  });

  useEffect(() => {
    async function init() {
      // Support contact from public config
      apiGet("/api/v1/auth/config")
        .then((c) => setSupport(c?.support ? c.support as SupportInfo : null))
        .catch(() => {});
      // Check if there's a pending payment first
      try {
        const history = await apiGet("/api/v1/subscriptions/my/history");
        const paymentEntries = (history || []).filter(
          (h: any) => h.action === "PAYMENT",
        );
        const latest =
          paymentEntries.length > 0
            ? paymentEntries.reduce((a: any, b: any) =>
                new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
              )
            : null;
        if (latest?.newStatus === "PENDING_VERIFICATION") {
          setStep("pending");
          return;
        }
      } catch {}
      const [p, prov] = await Promise.all([
        apiGet("/api/v1/subscriptions/plans").catch(() => []),
        apiGet("/api/v1/subscriptions/providers").catch(() => []),
      ]);
      setPlans(p);
      setProviders(prov);
      setStep("plans");
    }
    void init();
  }, []);

  async function handleRemind() {
    if (remindCooldownUntil > Date.now()) {
      const mins = Math.ceil((remindCooldownUntil - Date.now()) / 60_000);
      toast.warning(
        `Please wait about ${mins} more minute${mins === 1 ? "" : "s"} before reminding again.`,
      );
      return;
    }
    setReminding(true);
    try {
      const token = tokenStore.getAccessToken();
      const res = await fetch(
        `${API_URL}/api/v1/subscriptions/notify-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: "Reminder from owner" }),
        },
      );
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      if (!res.ok) throw new Error();
      if (data?.throttled) {
        const until = Date.now() + (data.retryAfterMinutes ?? 120) * 60_000;
        localStorage.setItem("kasa_remind_until", String(until));
        setRemindCooldownUntil(until);
        toast.warning(
          data.message || "You reminded the admin recently. Please wait.",
        );
        return;
      }
      const until = Date.now() + 2 * 60 * 60 * 1000;
      localStorage.setItem("kasa_remind_until", String(until));
      setRemindCooldownUntil(until);
      toast.success(
        "Reminder sent — please wait for the admin to verify your payment.",
      );
    } catch {
      toast.error(
        "Failed to send reminder. Please contact the admin directly.",
      );
    } finally {
      setReminding(false);
    }
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "pending") {
    const onCooldown = remindCooldownUntil > Date.now();
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <Bell className="h-8 w-8 text-amber-500" />
          </span>
          <h1 className="text-xl font-bold">Payment Pending</h1>
          <p className="text-sm text-muted-foreground">
            Your payment is waiting for admin confirmation. You'll be able to
            use the app once it's verified.
          </p>
          <button
            type="button"
            onClick={handleRemind}
            disabled={reminding || onCooldown}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {reminding
              ? "Sending…"
              : onCooldown
                ? "Reminded ✓"
                : "Remind Admin"}
          </button>
          <button
            type="button"
            onClick={() => setStep("plans")}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            I want a different plan
          </button>
          <PaywallActions support={support} />
        </div>
      </div>
    );
  }

  if (step === "providers" && selectedPlan) {
    async function handleNotify() {
      if (!selectedProviderId) return;
      setNotifying(true);
      try {
        const token = tokenStore.getAccessToken();
        const res = await fetch(
          `${API_URL}/api/v1/subscriptions/notify-payment`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              planId: selectedPlan!.id,
              providerId: selectedProviderId,
              reference: reference.trim() || undefined,
              notes: notes.trim() || undefined,
              screenshotUrl: screenshotUrl ?? undefined,
            }),
          },
        );
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        if (!res.ok) throw new Error();
        if (data?.throttled) {
          toast.warning(
            data.message ||
              "The admin was already notified recently — please wait.",
          );
        } else {
          toast.success(
            "Payment reported — please wait for the admin to verify it.",
          );
        }
        setNotified(true);
      } catch {
        setError(
          "Failed to send notification. Please try again or contact the admin directly.",
        );
        toast.error("Failed to notify the admin. Please try again.");
      } finally {
        setNotifying(false);
      }
    }

    if (notified) {
      return (
        <div className="flex min-h-dvh flex-col bg-background">
          <main className="mx-auto w-full max-w-sm flex-1 flex flex-col items-center justify-center px-4 text-center space-y-4">
            <Check className="h-12 w-12 text-success" />
            <h1 className="text-xl font-bold">Notification Sent!</h1>
            <p className="text-sm text-muted-foreground">
              Your payment details have been sent to the admin. You'll be
              notified once your subscription is activated.
            </p>
            <div className="w-full">
              <PaywallActions support={support} />
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Kasa</p>
              <p className="text-xs text-muted-foreground">
                Complete your subscription
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
          <div className="text-center">
            <Crown className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h1 className="text-xl font-bold">Almost there!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how you'd like to pay for{" "}
              <strong>{selectedPlan.name}</strong>
            </p>
            <p className="text-lg font-bold mt-2">
              {selectedPlan.monthlyPriceCents === 0
                ? "Free"
                : `${formatMoneyCents(selectedPlan.monthlyPriceCents)}/mo`}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              <div className="flex-1">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs underline mt-1 hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {providers.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No payment providers configured yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please contact the administrator.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select a payment method below to view instructions:
              </p>
              {providers.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedProviderId(p.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedProviderId === p.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-lg p-2 ${selectedProviderId === p.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {p.kind}
                      </p>
                      {p.instructions && (
                        <div className="rounded-lg bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono">
                          {p.instructions}
                        </div>
                      )}
                      {p.contactInfo && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Contact:{" "}
                          <span className="font-medium text-foreground">
                            {p.contactInfo}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedProviderId && (
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">Notify Admin of Payment</h3>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Transaction Reference / ID
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="e.g. Bank receipt #12345"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                  placeholder="Any additional info..."
                />
              </div>
              <FileSelector
                context="payment-proof"
                value={screenshotUrl}
                onChange={setScreenshotUrl}
                label="Payment Screenshot (optional)"
              />
              <button
                type="button"
                onClick={handleNotify}
                disabled={notifying}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
              >
                {notifying ? "Submitting..." : "Mark as Paid"}
              </button>
              <p className="text-xs text-center text-muted-foreground">
                After paying via the chosen method, click here to notify the
                admin. Your subscription will be activated once confirmed.
              </p>
            </Card>
          )}

          <button
            type="button"
            onClick={() => setStep("plans")}
            className="text-sm text-primary hover:underline"
          >
            ← Back to plans
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Lela Kasa</p>
            <p className="text-xs text-muted-foreground">
              Choose a plan to get started
            </p>
          </div>
          <LangToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 space-y-6">
        <div className="text-center">
          <Crown className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h1 className="text-2xl font-bold">Subscribe to Lela Kasa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick the plan that fits your beverage shop
          </p>
        </div>

        {plans.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No plans available. Please contact the administrator.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const displayFeatures = getDisplayFeatures(plan.features);
              return (
                <Card key={plan.id} className="flex flex-col p-5">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {plan.description}
                    </p>
                  )}
                  <p className="text-2xl font-bold mb-1">
                    {plan.monthlyPriceCents === 0
                      ? "Free"
                      : `${formatMoneyCents(plan.monthlyPriceCents)}/mo`}
                  </p>
                  {plan.trialDays > 0 && (
                    <p className="text-xs text-success mb-3">
                      {plan.trialDays}-day free trial
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-3 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5">
                      {plan.maxShops === -1 ? "∞" : plan.maxShops} shops
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5">
                      {plan.maxUsers === -1 ? "∞" : plan.maxUsers} users
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5 mb-4">
                    {displayFeatures.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs">
                        <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                    {displayFeatures.length > 6 && (
                      <p className="text-xs text-muted-foreground">
                        +{displayFeatures.length - 6} more
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setStep("providers");
                    }}
                    className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {plan.monthlyPriceCents === 0
                      ? "Select Free Plan"
                      : "Choose Plan"}
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
