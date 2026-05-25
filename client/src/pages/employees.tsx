import { Eye, Pencil, Plus, UserX, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { EmployeeDrawer, DeactivateDialog } from '@/components/employee-drawer';
import { sdk } from '@/lib/sdk';
import type { Employee } from '@/sdk';
import { useI18n } from '@/lib/i18n';
import { FormattedDate } from '@/ui';
import { useNavigate } from 'react-router-dom';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const list = await sdk.employees.list();
      setEmployees(list);
    } catch {
      toast.error(t('failedLoadEmployees'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchEmployees(); }, []);

  function handleSaved(saved: Employee) {
    setDrawerOpen(false);
    setEmployees((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const updated = await sdk.employees.update(deactivateTarget.id, { isActive: false });
      toast.success(t('employeeDeactivated'));
      setDeactivateTarget(null);
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      toast.error(t('failedDeactivateEmployee'));
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  }

  const filtered = search
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase()),
      )
    : employees;

  const columns = [
    {
      key: 'name',
      header: t('name'),
      render: (e: Employee) => (
        <button
          type="button"
          onClick={() => navigate(`/employees/${e.id}`)}
          className="font-medium text-primary hover:underline text-left"
        >
          {e.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: t('email'),
      render: (e: Employee) => <span className="text-muted-foreground">{e.email}</span>,
    },
    {
      key: 'role',
      header: t('role'),
      render: (e: Employee) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.role === 'OWNER' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {e.role}
        </span>
      ),
    },
    {
      key: 'active',
      header: t('active'),
      render: (e: Employee) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
          {e.isActive ? t('active') : t('inactive')}
        </span>
      ),
    },
    {
      key: 'created',
      header: t('joined'),
      render: (e: Employee) => (
        <span className="text-muted-foreground"><FormattedDate iso={e.createdAt} /></span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (e: Employee) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); navigate(`/employees/${e.id}`); }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title={t('view') as string}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); setEditing(e); setDrawerOpen(true); }}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title={t('editEmployee') as string}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {e.isActive && e.role !== 'OWNER' && (
            <>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); navigate(`/employees/${e.id}/permissions`); }}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Manage Permissions"
              >
                <ShieldCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setDeactivateTarget(e); }}
                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title={t('deactivate') as string}
              >
                <UserX className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('manageEmployees')}
        description={t('manageEmployeesDesc')}
        breadcrumb={[t('shop'), t('manageEmployees')]}
        actions={
          <button
            type="button"
            onClick={() => { setEditing(null); setDrawerOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('inviteEmployee')}
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder={t('searchEmployees') as string}
        search={search}
        onSearchChange={setSearch}
        empty={loading ? t('loading') : t('noEmployeesFound')}
      />

      <EmployeeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onSaved={handleSaved}
      />

      <DeactivateDialog
        employee={deactivateTarget}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        saving={deactivating}
      />
    </div>
  );
}
