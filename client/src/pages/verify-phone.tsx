import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, Smartphone } from "lucide-react";
import { sdk } from "@/lib/sdk";

const ic =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

export default function VerifyPhonePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get("phone") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  // The OTP was already sent once during registration · this page does not
  // auto-send, so a new account receives exactly one SMS. "Resend" is a manual
  // action for when the original code expires or the page is reached later.
  async function resend() {
    if (!phone) return;
    setResending(true);
    setError(null);
    try {
      await sdk.auth.requestOtp(phone, "phone_verification");
      toast.success("New verification code sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send code";
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await sdk.auth.verifyPhone(phone, code.trim());
      setVerified(true);
      toast.success("Phone verified");
      setTimeout(() => navigate("/sales", { replace: true }), 1500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (verified) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <Check className="h-12 w-12 text-success mb-4" />
        <h1 className="text-xl font-bold">Phone Verified!</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-7 w-7 text-primary" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Verify Your Phone</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the code we sent to <strong>{phone}</strong>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Verification Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className={ic}
                placeholder="• • • • • •"
                inputMode="numeric"
                autoFocus
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Verifying..." : "Verify Phone"}
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              {resending ? "Sending..." : "Didn't get a code? Resend"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/sales", { replace: true })}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
