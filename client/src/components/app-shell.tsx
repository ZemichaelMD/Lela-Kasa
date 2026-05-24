import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import PaymentWall from "./payment-wall";
import { ChatFab } from "./chatbot";
import { API_URL, tokenStore } from "@/lib/sdk";
import { useAuthContext } from "@/lib/auth-context";
import MaintenancePage from "@/pages/maintenance";

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
      {/* Fixed sidebar — lg and up */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <Sidebar />
      </aside>

      {/* Off-canvas drawer — below lg */}
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
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <ChatFab />
    </div>
  );
}
