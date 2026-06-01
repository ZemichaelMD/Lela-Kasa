import { ChevronDown, LogOut, Menu, Package, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { API_URL, tokenStore, sdk } from "@/lib/sdk";
import type { Customer } from "@/sdk";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme";

function OrdersBell() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCount() {
      try {
        const token = tokenStore.getAccessToken();
        const res = await fetch(`${API_URL}/api/v1/orders/shop/pending/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const envelope = await res.json();
        setCount(envelope?.data?.count ?? 0);
      } catch {}
    }
    void fetchCount();
    // TODO need to replace this with a socket connection or something, polling is not ideal
    // const i = setInterval(fetchCount, 20000);
    // return () => clearInterval(i);
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate("/orders")}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
    >
      <Package className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground ring-2 ring-card">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
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
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectCustomer(c: Customer) {
    setQuery("");
    setResults([]);
    setOpen(false);
    navigate(`/customers/${c.id}`);
  }

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm" ref={ref}>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Search className="h-4 w-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers…"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c)}
              className="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate font-medium text-foreground">
                {c.code && (
                  <span className="mr-1.5 inline-flex items-center rounded bg-muted px-1.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {c.code}
                  </span>
                )}
                {c.name}
              </span>
              {c.phone && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.phone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-lg border border-border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-lg">
          No customers found
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
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const initial = (user?.name ?? user?.email ?? "A").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <CustomerSearch />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <OrdersBell />
        <LangToggle />
        <ThemeToggle />
        <div className="relative ml-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-1.5 text-sm transition-colors hover:bg-accent md:pr-2.5"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-strong text-xs font-semibold text-primary-foreground">
              {initial}
            </span>
            <span className="hidden max-w-[10rem] truncate font-medium md:inline">
              {user?.name ?? user?.email ?? "Admin"}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-lg border border-border bg-popover p-1 text-sm shadow-lg">
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Signed in as
                <span className="block truncate font-medium text-foreground">
                  {user?.email ?? "·"}
                </span>
                <span className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  {user?.role ?? "USER"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
                className="flex min-h-[40px] w-full items-center gap-2 rounded-md px-3 py-2 text-left font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
