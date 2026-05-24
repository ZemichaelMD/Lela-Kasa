import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { sdk } from '@/lib/sdk';
import type { PriceTier, Shop } from '@/sdk';
import { Card, FormattedDate } from '@/ui';

import { useI18n } from '@/lib/i18n';

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [shop, setShop] = useState<Shop | null>(null);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [defaultPriceTierId, setDefaultPriceTierId] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [shopData, tiersData] = await Promise.all([
          sdk.shops.getMyShop(),
          sdk.priceTiers.list(),
        ]);
        setShop(shopData);
        setTiers(tiersData);
        // Populate form
        setName(shopData.name);
        setPhone(shopData.phone ?? '');
        setAddress(shopData.address ?? '');
        setTimezone(shopData.timezone);
        setLowStockThreshold(String(shopData.lowStockThreshold));
        setDefaultPriceTierId(shopData.defaultPriceTierId ?? '');
      } catch {
        toast.error(t('failedLoadSettings'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await sdk.shops.updateMyShop({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        timezone: timezone.trim(),
        lowStockThreshold: Number(lowStockThreshold),
      });
      setShop(updated);
      toast.success(t('settingsSaved'));
    } catch {
      toast.error(t('failedSaveSettings'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings')}
        description={t('shopConfiguration')}
        breadcrumb={['Shop', t('settings')]}
        actions={
          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60 hover:bg-primary/90"
          >
            {saving ? t('saving') : t('saveChanges')}
          </button>
        }
      />

      <Card className="p-6">
        <form id="settings-form" onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
          <Field label={t('shopName')}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder={t('myShopPlaceholder')}
            />
          </Field>

          <Field label={t('phone')}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder={t('phonePlaceholder')}
            />
          </Field>

          <Field label={t('address')} hint={t('addressHint')}>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder={t('addressPlaceholder')}
            />
          </Field>

          <Field label={t('timezone')} hint={t('timezoneHint')}>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className={inputClass}
              placeholder="Africa/Addis_Ababa"
            />
          </Field>

          <Field label={t('lowStockThresholdLabel')} hint={t('lowStockThresholdHint')}>
            <input
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              type="number"
              min={0}
              required
              className={inputClass}
              placeholder="12"
            />
          </Field>

          <Field label={t('defaultPriceTier')} hint={t('defaultPriceTierHint')}>
            <select
              value={defaultPriceTierId}
              onChange={(e) => setDefaultPriceTierId(e.target.value)}
              className={inputClass}
            >
              <option value="">— {t('none')} —</option>
              {tiers.map((t_tier) => (
                <option key={t_tier.id} value={t_tier.id}>
                  {t_tier.name} ({t_tier.kind})
                </option>
              ))}
            </select>
          </Field>

          {shop && (
            <div className="sm:col-span-2 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium text-foreground">{t('currencyLabel')}:</span> {shop.currency} (read-only)</p>
              <p><span className="font-medium text-foreground">{t('shopIdLabel')}:</span> {shop.id}</p>
              <p>
                <span className="font-medium text-foreground">{t('createdLabel')}:</span>{' '}
                <FormattedDate iso={shop.createdAt} />
              </p>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
