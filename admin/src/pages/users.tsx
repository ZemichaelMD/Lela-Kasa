import { BadgeCheck, Pencil, Plus, Shield, Building2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, StatusChip } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { AdminUser } from '@/sdk';
import { useI18n } from '@/lib/i18n';
import { FormattedDate } from '@/ui';

const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

function UserDrawer({ open, onClose, onSaved, editing }: { open: boolean; onClose: () => void; onSaved: () => void; editing: AdminUser | null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OWNER');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setEmail(editing?.email ?? '');
      setPhone(editing?.phone ?? '');
      setPassword('');
      setRole(editing?.role ?? 'OWNER');
      setIsActive(editing?.isActive ?? true);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await sdk.admin.updateUser(editing.id, { name: name.trim() || undefined, phone: phone.trim() || null, role: role as any, isActive });
        toast.success('User updated');
      } else {
        await sdk.admin.createUser({ email: email.trim(), name: name.trim() || undefined, phone: phone.trim() || undefined, password: password.trim() || undefined, role });
        toast.success('User created');
      }
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'Failed to save user'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{editing ? 'Edit User' : 'Create User'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          {!editing && (
            <div className="space-y-1.5"><label className="text-sm font-medium">Email *</label><input ref={nameRef} value={email} onChange={e => setEmail(e.target.value)} type="email" required className={inputClass} /></div>
          )}
          <div className="space-y-1.5"><label className="text-sm font-medium">Name</label><input value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} /></div>
          {!editing && (
            <div className="space-y-1.5"><label className="text-sm font-medium">Password <span className="text-xs text-muted-foreground">(optional, auto-generated)</span></label><input value={password} onChange={e => setPassword(e.target.value)} type="password" className={inputClass} /></div>
          )}
          <div className="space-y-1.5"><label className="text-sm font-medium">Role</label><select value={role} onChange={e => setRole(e.target.value)} className={inputClass}>
            <option value="OWNER">Owner</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select></div>
          {editing && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
              <div><p className="text-sm font-medium">Active</p><p className="text-xs text-muted-foreground">Allow user to log in</p></div>
              <button type="button" onClick={() => setIsActive(!isActive)} className={`relative h-5 w-9 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isActive ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          )}
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </aside>
    </>
  );
}

export default function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { setUsers(await sdk.admin.listUsers()); }
    catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name?.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.phone?.toLowerCase().includes(q)) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (activeFilter === 'active' && !u.isActive) return false;
    if (activeFilter === 'inactive' && u.isActive) return false;
    return true;
  });

  const columns = [
    { key: 'name', header: 'Name', render: (u: AdminUser) => <span className="font-medium">{u.name ?? '—'}</span> },
    { key: 'email', header: 'Email', render: (u: AdminUser) => <span className="text-muted-foreground">{u.email}</span> },
    { key: 'phone', header: 'Phone', render: (u: AdminUser) => (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {u.phone ?? '—'}
        {u.phone && u.phoneVerified && (
          <BadgeCheck className="h-4 w-4 text-success" aria-label="Phone verified" />
        )}
      </span>
    )},
    { key: 'role', header: 'Role', render: (u: AdminUser) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'SUPER_ADMIN' ? 'bg-primary/10 text-primary' : u.role === 'OWNER' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>{u.role}</span>
    )},
    { key: 'shop', header: 'Shop', render: (u: AdminUser) => <span className="text-xs text-muted-foreground">{u.shop?.name ?? '—'}</span> },
    { key: 'active', header: 'Status', render: (u: AdminUser) => <StatusChip label={u.isActive ? 'Active' : 'Inactive'} tone={u.isActive ? 'success' : 'neutral'} /> },
    { key: 'created', header: 'Created', render: (u: AdminUser) => <span className="text-xs text-muted-foreground"><FormattedDate iso={u.createdAt} /></span> },
    { key: 'actions', header: '', className: 'w-24', render: (u: AdminUser) => (
      <button type="button" onClick={() => { setEditTarget(u); setDrawerOpen(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Users Management" description="All platform users — owners, employees, and admins" breadcrumb={['Platform', 'Users']} actions={
        <button type="button" onClick={() => { setEditTarget(null); setDrawerOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> New User</button>
      } />

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder="Search by name, email, or phone..."
        search={search}
        onSearchChange={setSearch}
        filterBar={
          <div className="flex flex-wrap items-center gap-3">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none">
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="OWNER">Owner</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none">
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        }
        activeFilterCount={(roleFilter ? 1 : 0) + (activeFilter !== 'all' ? 1 : 0) + (search ? 1 : 0)}
        onClearFilters={() => { setSearch(''); setRoleFilter(''); setActiveFilter('all'); }}
        total={filtered.length}
        empty={loading ? 'Loading...' : 'No users found'}
      />

      <UserDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={() => { setDrawerOpen(false); void fetchUsers(); }} editing={editTarget} />
    </div>
  );
}
