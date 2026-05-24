import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown, ArrowRight, CreditCard, Check, Bell, Sparkles } from "lucide-react";
import { API_URL, tokenStore } from "@/lib/sdk";
import { Card, Skeleton } from "@/ui";
import { formatMoneyCents } from "@/utils/money";
import { useI18n } from "@/lib/i18n";

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const envelope = await res.json();
  return envelope?.data ?? envelope;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

const ACTION_STYLES: Record<string, string> = {
  CREATED: "bg-muted text-muted-foreground",
  ACTIVATED: "bg-success/15 text-success",
  PAYMENT: "bg-primary/10 text-primary",
  PLAN_SELECTED: "bg-sky-500/15 text-sky-600",
  EXTENDED: "bg-sky-500/10 text-sky-600",
  CANCELLED: "bg-destructive/15 text-destructive",
  SUSPENDED: "bg-warning/15 text-warning",
  RESUMED: "bg-success/15 text-success",
  EXPIRED: "bg-muted text-muted-foreground",
};

const ic = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

export default function SubscriptionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sub, setSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [extending, setExtending] = useState(false);
  const [selectingPlan, setSelectingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [remindCooldownUntil, setRemindCooldownUntil] = useState<number>(() => {
    const stored = Number(localStorage.getItem("kasa_remind_until") || 0);
    return stored > Date.now() ? stored : 0;
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/api/v1/subscriptions/my"),
      apiGet("/api/v1/subscriptions/plans"),
      apiGet("/api/v1/subscriptions/my/history"),
    ]).then(([s, p, h]) => {
      setSub(s);
      setPlans(p || []);
      setHistory(h);
      if (s?.billingCycle) setBillingCycle(s.billingCycle);
      const paymentEntries = h.filter((e: any) => e.action === "PAYMENT");
      const latest = paymentEntries.length > 0
        ? paymentEntries.reduce((a: any, b: any) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
        : null;
      setHasPending(latest?.newStatus === "PENDING_VERIFICATION");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function trialDays() {
    if (!sub?.trialEndsAt || sub.status !== "TRIAL") return null;
    const end = new Date(sub.trialEndsAt).getTime();
    const now = Date.now();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return days;
  }

  async function handleSelectPlan(planId: string) {
    setSelectingPlan(true);
    setError(null);
    try {
      const token = tokenStore.getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/subscriptions/select-plan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      if (!res.ok) throw new Error(data?.error?.message || "Failed to select plan");
      setSelectedPlanId(planId);
      setSub((prev: any) => ({ ...prev, planId, planName: data.planName, billingCycle }));
      setExtending(true);
      try {
        const provs = await apiGet("/api/v1/subscriptions/providers");
        setProviders(provs);
      } catch {}
      toast.success("Plan selected! Choose a payment method below.");
    } catch (e: any) {
      toast.error(e.message || "Failed to select plan. Please try again.");
    } finally {
      setSelectingPlan(false);
    }
  }

  async function handleStartExtend() {
    setExtending(true);
    setError(null);
    setSelectedProviderId("");
    setReference("");
    setNotes("");
    setNotified(false);
    setSelectedPlanId(sub?.planId);
    try {
      const provs = await apiGet("/api/v1/subscriptions/providers");
      setProviders(provs);
    } catch {
      setError("Failed to load payment providers");
    }
  }

  async function handleNotify() {
    if (!selectedProviderId) return;
    setNotifying(true);
    setError(null);
    try {
      const token = tokenStore.getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/subscriptions/notify-payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId || sub?.planId || "",
          providerId: selectedProviderId,
          billingCycle,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      if (!res.ok) throw new Error();
      if (data?.throttled) {
        setHasPending(true);
        const until = Date.now() + (data.retryAfterMinutes ?? 120) * 60_000;
        localStorage.setItem("kasa_remind_until", String(until));
        setRemindCooldownUntil(until);
        toast.warning(data.message || "The admin was already notified recently — please wait.");
        return;
      }
      setNotified(true);
      setHasPending(true);
      const until = Date.now() + 2 * 60 * 60 * 1000;
      localStorage.setItem("kasa_remind_until", String(until));
      setRemindCooldownUntil(until);
      toast.success("Payment reported — please wait for the admin to verify it.");
    } catch {
      setError("Failed to send notification. Please try again or contact the admin directly.");
      toast.error("Failed to notify the admin. Please try again.");
    } finally {
      setNotifying(false);
    }
  }

  async function handleRemind() {
    if (!sub?.planId) return;
    if (remindCooldownUntil > Date.now()) {
      const mins = Math.ceil((remindCooldownUntil - Date.now()) / 60_000);
      toast.warning(`Please wait about ${mins} more minute${mins === 1 ? "" : "s"} before reminding again.`);
      return;
    }
    setReminding(true);
    setError(null);
    try {
      const token = tokenStore.getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/subscriptions/notify-payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ planId: sub.planId, billingCycle: sub.billingCycle, reference: "Reminder", notes: "Reminder from owner" }),
      });
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      if (!res.ok) throw new Error();
      if (data?.throttled) {
        const until = Date.now() + (data.retryAfterMinutes ?? 120) * 60_000;
        localStorage.setItem("kasa_remind_until", String(until));
        setRemindCooldownUntil(until);
        toast.warning(data.message || "You reminded the admin recently. Please wait.");
        return;
      }
      const until = Date.now() + 2 * 60 * 60 * 1000;
      localStorage.setItem("kasa_remind_until", String(until));
      setRemindCooldownUntil(until);
      toast.success("Reminder sent — please wait for the admin to verify your payment.");
    } catch {
      toast.error("Failed to send reminder. Please contact the admin directly.");
    } finally {
      setReminding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const td = trialDays();
  const currentPrice = billingCycle === "yearly" ? sub?.yearlyPriceCents : sub?.monthlyPriceCents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("subscription")}</h1>
          <p className="text-sm text-muted-foreground">{t("yourPlan")}</p>
        </div>
        <button type="button" onClick={() => navigate("/sales")}
          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {t("back")}
        </button>
      </div>

      {/* Trial Banner */}
      {td !== null && td > 0 && (
        <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${td <= 3 ? "border-red-500/50 bg-red-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${td <= 3 ? "bg-red-500/20 text-red-600" : "bg-amber-500/20 text-amber-600"}`}>
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className={`text-sm font-semibold ${td <= 3 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                Your free trial ends in {td} day{td !== 1 ? "s" : ""}. Upgrade now to keep access.
              </p>
              <p className="text-xs text-muted-foreground">After the trial, your shop access will be limited until you subscribe.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending verification banner */}
      {hasPending && (
        <Card className="p-4 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-600"><Bell className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Payment Pending Verification</p>
                <p className="text-xs text-muted-foreground">You have a payment that is waiting for admin confirmation.</p>
              </div>
            </div>
            <button type="button" onClick={handleRemind} disabled={reminding || remindCooldownUntil > Date.now()}
              className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
              {reminding ? "Sending…" : remindCooldownUntil > Date.now() ? "Reminded ✓" : "Remind Admin"}
            </button>
          </div>
        </Card>
      )}

      {/* Current Plan Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3"><Crown className="h-6 w-6 text-amber-500" /></div>
            <div>
              {sub?.hasSubscription ? (
                <>
                  <h2 className="text-xl font-bold">{sub.planName}</h2>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>{t("status")}: <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sub.status === "ACTIVE" ? "bg-success/15 text-success" : sub.status === "TRIAL" ? "bg-warning/15 text-warning" : sub.status === "PAST_DUE" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{sub.status}</span></p>
                    {sub.currentPriceCents > 0 && (<p><span className="text-muted-foreground">{t("amount")}:</span> {formatMoneyCents(sub.currentPriceCents)}{sub.billingCycle === "yearly" ? "/yr" : "/mo"}</p>)}
                    {sub.billingCycle && (<p><span className="text-muted-foreground">Billing:</span> {sub.billingCycle === "yearly" ? "Yearly" : "Monthly"}</p>)}
                    {sub.paidUntil && (<p><span className="text-muted-foreground">{t("paidUntil")}:</span> {fmt(sub.paidUntil)}</p>)}
                    {sub.trialEndsAt && sub.status === "TRIAL" && (<p><span className="text-muted-foreground">{t("trialEnds")}:</span> {fmt(sub.trialEndsAt)}</p>)}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{t("noActivePlan")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t("noActivePlanDesc")}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {sub?.hasSubscription && !hasPending && (
              <button type="button" onClick={handleStartExtend}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
                Extend Subscription
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Plan Picker */}
      {plans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              <button type="button" onClick={() => setBillingCycle("monthly")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Monthly
              </button>
              <button type="button" onClick={() => setBillingCycle("yearly")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${billingCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Yearly
                <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">Save ~17%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan: any) => {
              const price = billingCycle === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
              const monthlyEquivalent = billingCycle === "yearly" ? Math.round(plan.yearlyPriceCents / 12) : plan.monthlyPriceCents;
              const isCurrent = sub?.planId === plan.id;
              const rawFeatures = plan.features;
              let features: string[] = [];
              if (Array.isArray(rawFeatures)) {
                features = rawFeatures;
              } else if (typeof rawFeatures === 'string') {
                try { const p = JSON.parse(rawFeatures); if (Array.isArray(p)) features = p; } catch {}
              }

              return (
                <div key={plan.id} className={`rounded-xl border-2 p-5 flex flex-col ${isCurrent ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.description && <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>}

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatMoneyCents(monthlyEquivalent)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-xs text-muted-foreground mt-1">{formatMoneyCents(price)} billed yearly</p>
                  )}

                  <ul className="mt-4 space-y-2 flex-1">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-success mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button type="button" disabled
                      className="mt-4 w-full rounded-lg border-2 border-primary bg-primary/10 py-2 text-sm font-semibold text-primary">
                      Current Plan
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleSelectPlan(plan.id)} disabled={selectingPlan}
                      className="mt-4 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                      {selectingPlan ? "Selecting..." : "Select Plan"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extend / Payment flow */}
      {extending && (
        <Card className="p-5 space-y-4">
          {notified ? (
            <div className="text-center py-4 space-y-3">
              <Check className="h-10 w-10 text-success mx-auto" />
              <p className="font-semibold">Extension Request Sent!</p>
              <p className="text-sm text-muted-foreground">Your payment details have been sent to the admin. Your subscription will be extended once confirmed.</p>
              <button type="button" onClick={() => { setExtending(false); window.location.reload(); }}
                className="text-sm text-primary hover:underline">Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Extend Subscription</h3>
                <button type="button" onClick={() => setExtending(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{sub?.planName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount to Pay</span>
                  <span className="font-semibold text-lg">{formatMoneyCents(currentPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billing Cycle</span>
                  <span className="font-medium">{billingCycle === "yearly" ? "Yearly" : "Monthly"}</span>
                </div>
                {sub?.paidUntil && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current paid until</span>
                    <span>{fmt(sub.paidUntil)}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                  After payment is verified, your subscription will be extended.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <p>{error}</p>
                  <button type="button" onClick={() => setError(null)} className="text-xs underline mt-1 hover:no-underline">Dismiss</button>
                </div>
              )}

              {providers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Loading payment providers...</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Select a payment method to view instructions:</p>
                  <div className="space-y-2">
                    {providers.map((p) => (
                      <button type="button" key={p.id} onClick={() => setSelectedProviderId(p.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedProviderId === p.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/50"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2 ${selectedProviderId === p.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{p.name}</h3>
                            <p className="text-xs text-muted-foreground mb-1">{p.kind}</p>
                            {p.instructions && (
                              <div className="rounded-lg bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono">{p.instructions}</div>
                            )}
                            {p.contactInfo && (
                              <p className="mt-1 text-xs text-muted-foreground">Contact: <span className="font-medium text-foreground">{p.contactInfo}</span></p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selectedProviderId && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Transaction Reference / ID</label>
                    <input value={reference} onChange={(e) => setReference(e.target.value)} className={ic} placeholder="e.g. Bank receipt #12345" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none" />
                  </div>
                  <button type="button" onClick={handleNotify} disabled={notifying}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
                    {notifying ? "Submitting..." : "Mark as Paid"}
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Billing History */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">{t("billingHistory")}</h3>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noHistory")}</p>
        ) : (
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${h.newStatus === "PENDING_VERIFICATION" ? "border-l-2 border-l-amber-500 border-border" : "border-border"}`}>
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5 ${ACTION_STYLES[h.action] || "bg-muted"}`}>{h.action}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {h.plan?.name && <span className="text-xs text-muted-foreground">{h.plan.name}</span>}
                    {h.amountCents != null && <span className="text-xs text-muted-foreground">{formatMoneyCents(h.amountCents)}</span>}
                    {h.prevStatus && h.newStatus && <span className="text-xs text-muted-foreground">{h.prevStatus} → {h.newStatus}</span>}
                  </div>
                  {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                  {h.newStatus === "PENDING_VERIFICATION" && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending verification
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{fmt(h.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
