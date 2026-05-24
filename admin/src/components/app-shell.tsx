import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { sdk } from "@/lib/sdk";
import { X } from "lucide-react";

const BANNER_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  success: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
};

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("kasa_dismissed_banners") || "[]")); }
  catch { return new Set(); }
}

function persistDismissed(ids: Set<string>) {
  localStorage.setItem("kasa_dismissed_banners", JSON.stringify([...ids]));
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  useEffect(() => { sdk.admin.listBanners().then(setBanners).catch(() => {}); }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => { const next = new Set(prev); next.add(id); persistDismissed(next); return next; });
  }, []);

  const visibleBanners = banners.filter(b => !dismissed.has(b.id));

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      {/* Floating Desktop sidebar */}
      <aside className="fixed inset-y-3 left-3 hidden w-56 flex-col rounded-lg border border-border bg-card shadow-md lg:flex z-30">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r border-border bg-card shadow-xl flex flex-col">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-dvh min-w-0 lg:pl-[236px]">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        {/* Banners */}
        {visibleBanners.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            {visibleBanners.map(b => (
              <div key={b.id} className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm ${BANNER_STYLES[b.type] || BANNER_STYLES.info}`}>
                <span>{b.message}</span>
                <button type="button" onClick={() => dismiss(b.id)} className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
