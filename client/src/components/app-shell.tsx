import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import PaymentWall from "./payment-wall";
import { ChatFab } from "./chatbot";
import { API_URL, sdk, tokenStore } from "@/lib/sdk";
import { useAuthContext } from "@/lib/auth-context";
import type { Banner } from "@/sdk";
import MaintenancePage from "@/pages/maintenance";

const BANNER_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  success:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
};

function getDismissed(): Set<string> {
  try {
    return new Set(
      JSON.parse(localStorage.getItem("kasa_dismissed_banners") || "[]"),
    );
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  localStorage.setItem("kasa_dismissed_banners", JSON.stringify([...ids]));
}

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const envelope = await res.json();
    return envelope?.data ?? envelope;
  } catch {
    return null;
  }
}

export function AppShell() {
  const { user } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState<
    "loading" | "maintenance" | "payment-wall" | "app"
  >("loading");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  useEffect(() => {
    sdk.shops
      .getBanners()
      .then(setBanners)
      .catch(() => {});
  }, []);

  const dismissBanner = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  }, []);

  const visibleBanners = banners.filter((b) => !dismissed.has(b.id));

  // Lock body scroll while the mobile drawer is open, and auto-close at lg.
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mql.matches && setMobileOpen(false);
    mql.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = prevOverflow;
      mql.removeEventListener("change", onChange);
    };
  }, [mobileOpen]);

  useEffect(() => {
    async function check() {
      const config = await apiGet("/api/v1/auth/config");
      if (config?.maintenanceMode) {
        setPage("maintenance");
        return;
      }

      if (
        user &&
        (user.role === "OWNER" || user.role === "EMPLOYEE") &&
        user.shopId
      ) {
        const sub = await apiGet("/api/v1/subscriptions/my");
        if (
          sub &&
          (!sub.hasSubscription ||
            (sub.status !== "ACTIVE" && sub.status !== "TRIAL"))
        ) {
          setPage("payment-wall");
          return;
        }
      }
      setPage("app");
    }
    void check();
  }, [user]);

  if (page === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
      </div>
    );
  }

  if (page === "maintenance") return <MaintenancePage />;
  if (page === "payment-wall") return <PaymentWall />;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Fixed sidebar · lg and up */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <Sidebar />
      </aside>

      {/* Off-canvas drawer · below lg */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          className={`absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-r border-border bg-card shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </aside>
      </div>

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        {visibleBanners.length > 0 && (
          <div className="space-y-2 px-4 pt-3 sm:px-5 lg:px-8">
            {visibleBanners.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm ${BANNER_STYLES[b.type] || BANNER_STYLES.info}`}
              >
                <span>{b.message}</span>
                <button
                  type="button"
                  onClick={() => dismissBanner(b.id)}
                  className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <ChatFab />
    </div>
  );
}
