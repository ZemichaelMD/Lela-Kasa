import { BadgeCheck, Eye, EyeOff, ExternalLink, Loader, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable, StatusChip } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { AdminUser } from '@/sdk';
import { useI18n } from '@/lib/i18n';
import { FormattedDate } from '@/ui';

const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${enabled ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function UserDrawer({ open, onClose, onSaved, editing }: { open: boolean; onClose: () => void; onSaved: () => void; editing: AdminUser | null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [role, setRole] = useState('OWNER');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [togglingPhone, setTogglingPhone] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setEmail(editing?.email ?? '');
      setPhone(editing?.phone ?? '');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordChangeOpen(false);
      setRole(editing?.role ?? 'OWNER');
      setIsActive(editing?.isActive ?? true);
      setEmailVerified(editing?.emailVerified ?? false);
      setPhoneVerified(editing?.phoneVerified ?? false);
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

  async function handleToggleEmail(v: boolean) {
    if (!editing) return;
    setTogglingEmail(true);
    try {
      await sdk.admin.toggleUserEmailVerified(editing.id, v);
      setEmailVerified(v);
      toast.success(v ? 'Email marked as verified' : 'Email verification revoked');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update email verification');
    } finally {
      setTogglingEmail(false);
    }
  }

  async function handleTogglePhone(v: boolean) {
    if (!editing) return;
    setTogglingPhone(true);
    try {
      await sdk.admin.toggleUserPhoneVerified(editing.id, v);
      setPhoneVerified(v);
      toast.success(v ? 'Phone marked as verified' : 'Phone verification revoked');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update phone verification');
    } finally {
      setTogglingPhone(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!newPassword) { toast.error('New password is required'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    const classes = [/[a-z]/.test(newPassword), /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length;
    if (classes < 3) { toast.error('Use at least 3 of: lowercase, uppercase, numbers, symbols'); return; }

    setChangingPassword(true);
    try {
      await sdk.admin.changeUserPassword(editing.id, newPassword);
      toast.success('Password changed. User sessions have been revoked.');
      setPasswordChangeOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
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
            <>
              <Toggle enabled={isActive} onChange={setIsActive} label="Active" />

              {/* Email verification toggle */}
              <div className="rounded-lg border border-border px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {emailVerified ? <BadgeCheck className="h-5 w-5 text-success" /> : <BadgeCheck className="h-5 w-5 text-muted-foreground/40" />}
                    <div>
                      <p className="text-sm font-medium">Email Verified</p>
                      <p className="text-xs text-muted-foreground">{email ? email : 'No email'}</p>
                    </div>
                  </div>
                  {togglingEmail ? (
                    <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleEmail(!emailVerified)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${emailVerified ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${emailVerified ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Phone verification toggle */}
              <div className="rounded-lg border border-border px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {phoneVerified ? <BadgeCheck className="h-5 w-5 text-success" /> : <BadgeCheck className="h-5 w-5 text-muted-foreground/40" />}
                    <div>
                      <p className="text-sm font-medium">Phone Verified</p>
                      <p className="text-xs text-muted-foreground">{phone ? phone : 'No phone'}</p>
                    </div>
                  </div>
                  {togglingPhone ? (
                    <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTogglePhone(!phoneVerified)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${phoneVerified ? 'bg-primary' : 'bg-muted'}`}
                      disabled={!phone}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${phoneVerified ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Password change */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setPasswordChangeOpen(!passwordChangeOpen)}
                  className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium">Change Password</p>
                    <p className="text-xs text-muted-foreground">Set a new password for this user. Active sessions will be revoked.</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{passwordChangeOpen ? '▲' : '▼'}</span>
                </button>
                {passwordChangeOpen && (
                  <div className="border-t border-border px-3.5 py-3 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">New Password</label>
                      <div className="relative">
                        <input
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          className={inputClass}
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Confirm Password</label>
                      <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" required className={inputClass} placeholder="••••••••" />
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {changingPassword ? 'Changing...' : 'Set New Password'}
                    </button>
                  </div>
                )}
              </div>
            </>
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
  const navigate = useNavigate();
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
    { key: 'name', header: 'Name', render: (u: AdminUser) => (
      <button type="button" onClick={() => navigate(`/users/${u.id}`)} className="font-medium text-primary hover:underline text-left">{u.name ?? '—'}</button>
    )},
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
    { key: 'actions', header: '', className: 'w-36', render: (u: AdminUser) => (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => navigate(`/users/${u.id}`)} className="rounded p-1.5 text-muted-foreground hover:bg-accent" title="View"><ExternalLink className="h-4 w-4" /></button>
        <button type="button" onClick={() => { setEditTarget(u); setDrawerOpen(true); }} className="rounded p-1.5 text-muted-foreground hover:bg-accent" title="Edit"><Pencil className="h-4 w-4" /></button>
      </div>
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
