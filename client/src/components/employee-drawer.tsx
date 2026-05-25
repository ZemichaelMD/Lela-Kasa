import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { sdk } from '@/lib/sdk';
import type { Employee } from '@/sdk';
import { useI18n } from '@/lib/i18n';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Employee | null;
  onSaved: (e: Employee) => void;
}

export function EmployeeDrawer({ open, onClose, editing, onSaved }: DrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setEmail(editing?.email ?? '');
      setPhone(editing?.phone ?? '');
      setPassword('');
      setIsActive(editing?.isActive ?? true);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let saved: Employee;
      if (editing) {
        saved = await sdk.employees.update(editing.id, {
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          isActive,
        });
        toast.success(t('employeeUpdated'));
      } else {
        saved = await sdk.employees.invite({ name: name.trim(), email: email.trim(), phone: phone.trim() });
        toast.success(t('employeeInvited'));
      }
      onSaved(saved);
    } catch {
      toast.error(editing ? t('failedUpdateEmployee') : t('failedInviteEmployee'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{editing ? t('editEmployee') : t('inviteEmployee')}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('nameStar')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className={inputClass}
              placeholder={t('fullName') as string}
            />
          </div>
          {!editing && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('emailStar')}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className={inputClass}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t('phoneStar')}{' '}
                  <span className="text-xs text-muted-foreground font-normal">({t('smsNotificationSent')})</span>
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  required
                  className={inputClass}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('password')}</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className={inputClass}
                  placeholder={t('autoGeneratePassword') as string}
                />
              </div>
            </>
          )}
          {editing && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('phoneOptional')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={inputClass} placeholder="+251 9XX XXX XXX" />
            </div>
          )}
          {editing && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
              <div>
                <p className="text-sm font-medium">{t('active')}</p>
                <p className="text-xs text-muted-foreground">{t('activeEmployeesDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isActive ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          )}
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
              {saving ? t('saving') : editing ? t('saveChanges') : t('sendInvite')}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

interface DeactivateProps {
  employee: Employee | null;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function DeactivateDialog({ employee, onConfirm, onCancel, saving }: DeactivateProps) {
  const { t } = useI18n();
  if (!employee) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t('deactivateEmployeeQuestion')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>{employee.name}</strong> {t('deactivateEmployeeDesc')}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="button" onClick={onConfirm} disabled={saving} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90">
            {saving ? t('deactivating') : t('deactivate')}
          </button>
        </div>
      </div>
    </div>
  );
}
