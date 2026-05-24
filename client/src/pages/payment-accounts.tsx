import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { sdk } from '@/lib/sdk';
import type { PaymentAccount } from '@/sdk';
import { ApiError } from '@/sdk';
import { useI18n } from '@/lib/i18n';

// ─── Kind badge ───────────────────────────────────────────────────────────────

const KIND_STYLES: Record<string, string> = {
  CASH_PERSON: 'bg-success/15 text-success',
  BANK: 'bg-primary/10 text-primary',
  MOBILE_MONEY: 'bg-warning/15 text-warning',
  OTHER: 'bg-muted text-muted-foreground',
};

function KindBadge({ kind }: { kind: string }) {
  const { t } = useI18n();
  const cls = KIND_STYLES[kind] ?? 'bg-muted text-muted-foreground';
  const label = {
    CASH_PERSON: t('cash'),
    BANK: t('bank'),
    MOBILE_MONEY: t('mobileMoney'),
    OTHER: t('other'),
  }[kind] ?? kind;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

const KINDS = ['CASH_PERSON', 'BANK', 'MOBILE_MONEY', 'OTHER'] as const;

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  editing: PaymentAccount | null;
  onSaved: (a: PaymentAccount) => void;
}

function AccountDrawer({ open, onClose, editing, onSaved }: DrawerProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<string>('CASH_PERSON');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setKind(editing?.kind ?? 'CASH_PERSON');
      setHolderName(editing?.holderName ?? '');
      setBankName(editing?.bankName ?? '');
      setAccountNumber(editing?.accountNumber ?? '');
      setNotes(editing?.notes ?? '');
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const dto = {
        name: name.trim(),
        kind,
        holderName: holderName.trim() || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const saved = editing
        ? await sdk.paymentAccounts.update(editing.id, dto)
        : await sdk.paymentAccounts.create(dto);
      toast.success(editing ? t('accountUpdated') : t('accountCreated'));
      onSaved(saved);
    } catch {
      toast.error(t('failedSaveAccount'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

  const KIND_LABELS: Record<string, string> = {
    CASH_PERSON: t('cash'),
    BANK: t('bank'),
    MOBILE_MONEY: t('mobileMoney'),
    OTHER: t('other'),
  };

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
        aria-label={editing ? t('editAccount') : t('newAccount')}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{editing ? t('editAccount') : t('newAccount')}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('name')} *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} placeholder="e.g. CBE Main Account" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('kind')}</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('holderName')}</label>
            <input value={holderName} onChange={(e) => setHolderName(e.target.value)} className={inputClass} placeholder="Account holder" />
          </div>
          {(kind === 'BANK' || kind === 'MOBILE_MONEY') && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('bankName')}</label>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} placeholder="e.g. Commercial Bank of Ethiopia" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('accountNumber')}</label>
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} placeholder="Account / phone number" />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('notes')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Optional notes" />
          </div>
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
              {saving ? t('saving') : editing ? t('saveChanges') : t('create')}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

function DeleteDialog({ account, onConfirm, onCancel, deleting }: { account: PaymentAccount | null; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  const { t } = useI18n();
  if (!account) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold">{t('deleteAccountQuestion')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('permanentlyRemoveAccount')} <strong>{account.name}</strong>.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t('cancel')}</button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-destructive/90">
            {deleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentAccountsPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const list = await sdk.paymentAccounts.list();
      setAccounts(list);
    } catch {
      toast.error(t('failedLoadPaymentAccounts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchAccounts(); }, []);

  function handleSaved(saved: PaymentAccount) {
    setDrawerOpen(false);
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
  }

  async function toggleActive(account: PaymentAccount) {
    setTogglingId(account.id);
    try {
      const updated = await sdk.paymentAccounts.update(account.id, { isActive: !account.isActive });
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      toast.error(t('failedUpdatePrice')); // Reusing for generic update failure
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sdk.paymentAccounts.remove(deleteTarget.id);
      toast.success(t('accountDeleted'));
      setDeleteTarget(null);
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t('cannotDeleteAccountWithTx'));
      } else {
        toast.error(t('failedDeleteAccount'));
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = search
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          (a.holderName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : accounts;

  const columns = [
    {
      key: 'name',
      header: t('name'),
      render: (a: PaymentAccount) => <span className="font-medium">{a.name}</span>,
    },
    {
      key: 'kind',
      header: t('kind'),
      render: (a: PaymentAccount) => <KindBadge kind={a.kind} />,
    },
    {
      key: 'holder',
      header: t('holderName'),
      render: (a: PaymentAccount) => <span className="text-muted-foreground">{a.holderName ?? '—'}</span>,
    },
    {
      key: 'bank',
      header: t('bankName'),
      render: (a: PaymentAccount) => <span className="text-muted-foreground">{a.bankName ?? '—'}</span>,
    },
    {
      key: 'active',
      header: t('active'),
      render: (a: PaymentAccount) => (
        <button
          type="button"
          disabled={togglingId === a.id}
          onClick={(e) => { e.stopPropagation(); void toggleActive(a); }}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${a.isActive ? 'bg-primary' : 'bg-muted'}`}
          title={a.isActive ? t('activeClickToDeactivate') as string : t('inactiveClickToActivate') as string}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${a.isActive ? 'left-4' : 'left-0.5'}`} />
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (a: PaymentAccount) => (
        <div className="flex items-center gap-1">
          <PermissionGate permission="payment-accounts:edit">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(a); setDrawerOpen(true); }}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title={t('edit') as string}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </PermissionGate>
          <PermissionGate permission="payment-accounts:delete">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(a); }}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={t('delete') as string}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('paymentAccounts')}
        description={t('managePaymentAccountsDesc')}
        breadcrumb={[t('shop'), t('paymentAccounts')]}
        actions={
          <PermissionGate permission="payment-accounts:create">
            <button
              type="button"
              onClick={() => { setEditing(null); setDrawerOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t('newAccount')}
            </button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder={t('searchAccounts') as string}
        search={search}
        onSearchChange={setSearch}
        empty={loading ? t('loading') : t('noPaymentAccountsFound')}
      />

      <AccountDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onSaved={handleSaved}
      />

      <DeleteDialog
        account={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}
