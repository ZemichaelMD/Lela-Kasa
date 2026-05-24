import { Activity, Building2, Eye, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Card, EthiopianDateInput, FormattedDate, Skeleton } from '@/ui';
import { sdk } from '@/lib/sdk';
import type { AdminAuditLog } from '@/sdk';
import { useI18n } from '@/lib/i18n';

function fmt(iso: string): string {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function today() { return new Date().toISOString().slice(0, 10); }
function monthAgo() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

const ENTITY_ICONS: Record<string, typeof Activity> = { Shop: Building2, User: Activity, Sale: Activity, Customer: Activity, Beverage: Activity, default: Activity };

function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('create')) return 'text-success bg-success/10';
  if (a.includes('update') || a.includes('edit')) return 'text-primary bg-primary/10';
  if (a.includes('delete') || a.includes('void') || a.includes('deactivate') || a.includes('revoke')) return 'text-destructive bg-destructive/10';
  if (a.includes('login') || a.includes('logout')) return 'text-sky-600 bg-sky-500/10';
  return 'text-muted-foreground bg-muted';
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: AdminAuditLog | null; onClose: () => void }) {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audit Log Detail</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">ID</span>
            <span className="col-span-2 font-mono text-xs">{log.id}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Action</span>
            <span className="col-span-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>{log.action}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Entity Type</span>
            <span className="col-span-2">{log.entityType}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Entity ID</span>
            <span className="col-span-2 font-mono text-xs">{log.entityId}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Actor</span>
            <span className="col-span-2">{log.actorUser?.name ?? log.actorUser?.email ?? 'System'}</span>
          </div>
          {log.actorUser?.email && (
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Actor Email</span>
              <span className="col-span-2">{log.actorUser.email}</span>
            </div>
          )}
          {log.shop && (
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Shop</span>
              <span className="col-span-2">{log.shop.name}</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Timestamp</span>
            <span className="col-span-2">{fmt(log.createdAt)}</span>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterShop, setFilterShop] = useState('');
  const [dateFrom, setDateFrom] = useState(monthAgo());
  const [dateTo, setDateTo] = useState(today());
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await sdk.admin.listLogs();
      setLogs(list);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const actions = useMemo(() => [...new Set(logs.map(l => l.action))].sort(), [logs]);
  const entities = useMemo(() => [...new Set(logs.map(l => l.entityType))].sort(), [logs]);
  const shops = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of logs) { if (l.shop?.name) map.set(l.shop.name, l.shop.name); }
    return ['', ...map.keys()];
  }, [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      const matchesActor = l.actorUser?.name?.toLowerCase().includes(q) || l.actorUser?.email?.toLowerCase().includes(q);
      const matchesAction = l.action.toLowerCase().includes(q);
      const matchesEntity = l.entityType.toLowerCase().includes(q);
      const matchesId = l.entityId?.toLowerCase().includes(q);
      if (!matchesActor && !matchesAction && !matchesEntity && !matchesId) return false;
    }
    if (filterAction && l.action !== filterAction) return false;
    if (filterEntity && l.entityType !== filterEntity) return false;
    if (filterShop && l.shop?.name !== filterShop) return false;
    if (dateFrom && l.createdAt < dateFrom) return false;
    if (dateTo && l.createdAt > dateTo + 'T23:59:59') return false;
    return true;
  }), [logs, search, filterAction, filterEntity, filterShop, dateFrom, dateTo]);

  const hasFilters = search || filterAction || filterEntity || filterShop || dateFrom !== monthAgo() || dateTo !== today();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Platform-wide security and activity audit trail"
        breadcrumb={['Platform', 'Audit Logs']}
        actions={
          <button type="button" onClick={() => void fetchLogs()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actor, action, entity, ID..." className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs">From</span>
            <EthiopianDateInput value={dateFrom} onChange={setDateFrom} />
            <span className="text-muted-foreground text-xs">To</span>
            <EthiopianDateInput value={dateTo} onChange={setDateTo} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
            <option value="">All Entities</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
            <option value="">All Shops</option>
            {shops.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button type="button" onClick={() => { setSearch(''); setFilterAction(''); setFilterEntity(''); setFilterShop(''); setDateFrom(monthAgo()); setDateTo(today()); }} className="text-xs font-medium text-primary hover:underline">
              Clear filters
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Showing {filtered.length} of {logs.length} log entries</p>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          {hasFilters ? 'No log entries match your filters' : 'No audit log entries yet'}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const Icon = ENTITY_ICONS[log.entityType] ?? ENTITY_ICONS.default;
            return (
              <button
                type="button"
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
              >
                <div className={`rounded-lg p-2 mt-0.5 ${actionColor(log.action)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">{log.actorUser?.name ?? log.actorUser?.email ?? 'System'}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{log.action}</span>
                    <span className="text-xs text-muted-foreground">{log.entityType}</span>
                    {log.shop && <span className="text-xs text-muted-foreground">· {log.shop.name}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ID: {log.entityId?.slice(0, 12) ?? '—'}...
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap"><FormattedDate iso={log.createdAt} /></span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
