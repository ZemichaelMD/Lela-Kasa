import { Bell, ChevronDown, LogOut, Menu, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { sdk } from "@/lib/sdk";
import type { Customer } from "@/sdk";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme";
import { toast } from "sonner";

function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const { count: c } = await sdk.admin.getPendingPaymentCount();
      setCount(c);
    } catch {}
  }, []);

  // TODO need to replace this with a socket connection or something, polling is not ideal
  // useEffect(() => { void fetchCount(); const i = setInterval(fetchCount, 15000); return () => clearInterval(i); }, [fetchCount]);
  useEffect(() => {
    function f(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      try {
        setPayments(await sdk.admin.listPendingPayments());
      } catch {}
    }
  }

  async function handleVerify(id: string) {
    setVerifying(id);
    try {
      await sdk.admin.verifyPayment(id);
      toast.success("Payment verified");
      setPayments((p) => p.filter((x) => x.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Failed to verify");
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground ring-2 ring-card">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover shadow-md z-50 text-sm">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
            Notifications
          </div>
          {payments.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              All caught up!
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="border-b border-border last:border-0 px-3 py-2.5 space-y-1.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      (window.location.href = `/shops/${p.shopId}?tab=subscription`)
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-xs">
                        {p.shop?.name ?? "Shop"}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold">
                        {p.amountCents
                          ? `${(p.amountCents / 100).toFixed(2)} ETB`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {p.provider?.name}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify(p.id)}
                    disabled={verifying === p.id}
                    className="w-full rounded-md bg-primary py-1.5 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {verifying === p.id ? "..." : "Verify"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await sdk.customers.list({
          search: query.trim(),
          pageSize: 8,
        });
        setResults(data.data);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function f(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  function selectCustomer(c: Customer) {
    setQuery("");
    setResults([]);
    setOpen(false);
    navigate(`/customers/${c.id}`);
  }

  return (
    <div className="relative hidden md:block w-48 lg:w-64" ref={ref}>
      <div className="flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 text-sm text-muted-foreground focus-within:border-primary/50 focus-within:bg-card">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-1 shadow-md">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c)}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent"
            >
              <span className="font-medium">{c.name}</span>
              {c.phone && (
                <span className="text-[10px] text-muted-foreground">
                  {c.phone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover px-3 py-3 text-center text-xs text-muted-foreground shadow-md">
          No matches
        </div>
      )}
    </div>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function f(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  const initial = (user?.name ?? user?.email ?? "A").charAt(0).toUpperCase();

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-background px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <CustomerSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <LangToggle />
        <ThemeToggle />
        <NotificationsBell />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              {initial}
            </span>
            <span className="hidden md:inline font-medium text-foreground">
              {user?.name ?? "Admin"}
            </span>
            <ChevronDown className="hidden h-3 w-3 text-muted-foreground md:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-popover p-1 shadow-md text-xs">
              <div className="px-2.5 py-2 text-muted-foreground border-b border-border">
                <p className="truncate font-medium text-foreground">
                  {user?.email ?? "—"}
                </p>
                <p className="text-[10px] uppercase tracking-wider mt-0.5">
                  {user?.role ?? "USER"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
