import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BadgeCheck, Bot, Key, LifeBuoy, Lock, Mail, Phone, Send, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PermissionGate, usePermission } from '@/components/permission-gate';
import { sdk, API_URL } from '@/lib/sdk';
import type { PriceTier, Shop, VerificationStatus } from '@/sdk';
import { Card, FormattedDate } from '@/ui';

import { useI18n } from '@/lib/i18n';

interface SupportInfo {
  phone: string;
  email: string;
  telegram: string;
  whatsapp: string;
  hours: string;
  url: string;
  message: string;
}

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

/** Small verified / unverified pill shown next to a contact channel. */
function VerifiedBadge({ verified, t }: { verified: boolean; t: (k: any) => string }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      <BadgeCheck className="h-3.5 w-3.5" /> {t('verified')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
      <ShieldAlert className="h-3.5 w-3.5" /> {t('notVerified')}
    </span>
  );
}

/** Two-step OTP modal for changing the owner's verified phone number. */
function PhoneChangeModal({
  open,
  onClose,
  onChanged,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  t: (k: any) => string;
}) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function requestOtp() {
    if (!newPhone.trim()) return;
    setBusy(true);
    try {
      await sdk.auth.requestPhoneChange(newPhone.trim());
      setStep('code');
      toast.success(t('otpSentToNewPhone'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('otpSendFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.trim().length !== 6) {
      toast.error(t('enterSixDigitCode'));
      return;
    }
    setBusy(true);
    try {
      await sdk.auth.confirmPhoneChange(newPhone.trim(), code.trim());
      toast.success(t('phoneChanged'));
      setStep('phone');
      setNewPhone('');
      setCode('');
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('verificationFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-base font-semibold">{t('changePhoneTitle')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {step === 'phone' ? t('changePhoneStep1') : t('changePhoneStep2')}
        </p>
        <div className="mt-4 space-y-3">
          {step === 'phone' ? (
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className={inputClass}
              placeholder="+251 9XX XXX XXX"
              type="tel"
              autoFocus
            />
          ) : (
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={inputClass}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={step === 'phone' ? requestOtp : confirm}
              disabled={busy}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy
                ? t('loading')
                : step === 'phone'
                  ? t('sendCode')
                  : t('confirmChange')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Password change modal. */
function PasswordChangeModal({
  open,
  onClose,
  t,
}: {
  open: boolean;
  onClose: () => void;
  t: (k: any) => string;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('fillRequiredFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    setBusy(true);
    try {
      await sdk.auth.changePassword({ currentPassword, newPassword });
      toast.success(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('failedSaveSettings'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-base font-semibold">{t('changePassword')}</h3>
        <div className="mt-4 space-y-3">
          <input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            placeholder={t('enterCurrentPassword')}
            type="password"
            autoComplete="current-password"
            autoFocus
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder={t('enterNewPassword')}
            type="password"
            autoComplete="new-password"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder={t('confirmNewPasswordPlaceholder')}
            type="password"
            autoComplete="new-password"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
          />
          <p className="text-xs text-muted-foreground">{t('passwordRequirement')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? t('loading') : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
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
  const [description, setDescription] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [mapUrl, setMapUrl] = useState('');

  const [support, setSupport] = useState<SupportInfo | null>(null);
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [chatBubbleVisible, setChatBubbleVisible] = useState(true);
  const [togglingChat, setTogglingChat] = useState(false);

  const [account, setAccount] = useState<{
    name: string | null;
    email: string;
    phone?: string | null;
    verifications?: VerificationStatus;
  } | null>(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  async function reloadAccount() {
    try {
      const me = await sdk.auth.me();
      setAccount({
        name: me.name ?? null,
        email: me.email,
        phone: me.phone,
        verifications: me.verifications,
      });
    } catch {
      /* account card stays hidden */
    }
  }

  async function handleConnectTelegram() {
    setConnectingTelegram(true);
    try {
      const info = await sdk.telegram.getLinkInfo();
      if (!info.configured || !info.deepLink) {
        toast.error(t('telegramNotConfiguredYet'));
        return;
      }
      window.open(info.deepLink, '_blank', 'noopener');
      toast.success(t('telegramOpening'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('telegramLinkFailed'));
    } finally {
      setConnectingTelegram(false);
    }
  }

  async function handleToggleChatBubble() {
    setTogglingChat(true);
    const next = !chatBubbleVisible;
    try {
      await sdk.shops.setSetting('chat_bubble_visible', next ? 'true' : 'false');
      setChatBubbleVisible(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setTogglingChat(false);
    }
  }

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
        // Public app config carries the operator's support contact details.
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/config`);
          const envelope = await res.json();
          const cfg = envelope?.data ?? envelope;
          if (cfg?.support) setSupport(cfg.support as SupportInfo);
        } catch {
          /* support card simply stays hidden */
        }
        void reloadAccount();
        // Chat bubble visibility from shop settings
        try {
          const vis = await sdk.shops.getSetting('chat_bubble_visible');
          if (vis !== null) setChatBubbleVisible(vis === 'true');
        } catch {}
        // Populate form
        setName(shopData.name);
        setPhone(shopData.phone ?? '');
        setAddress(shopData.address ?? '');
        setTimezone(shopData.timezone);
        setLowStockThreshold(String(shopData.lowStockThreshold));
        setDefaultPriceTierId(shopData.defaultPriceTierId ?? '');
        setDescription(shopData.description ?? '');
        setShopEmail(shopData.email ?? '');
        setWebsite(shopData.website ?? '');
        setFacebook(shopData.facebook ?? '');
        setInstagram(shopData.instagram ?? '');
        setTiktok(shopData.tiktok ?? '');
        setMapUrl(shopData.mapUrl ?? '');
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
        phone: phone.trim(),
        address: address.trim(),
        timezone: timezone.trim(),
        lowStockThreshold: Number(lowStockThreshold),
        description: description.trim(),
        email: shopEmail.trim(),
        website: website.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        mapUrl: mapUrl.trim(),
      });
      setShop(updated);
      setMapUrl(updated.mapUrl ?? '');
      toast.success(t('settingsSaved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('failedSaveSettings'));
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

      {account && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold">{t('accountSection')}</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('emailLabel')}
                  </p>
                  <p className="text-sm font-medium">{account.email}</p>
                </div>
              </div>
              <VerifiedBadge
                verified={!!account.verifications?.email.verified}
                t={t}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('phoneLabel')}
                  </p>
                  <p className="text-sm font-medium">{account.phone || '·'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <VerifiedBadge
                  verified={!!account.verifications?.phone.verified}
                  t={t}
                />
                {account.phone && !account.verifications?.phone.verified && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/verify-phone?phone=${encodeURIComponent(account.phone ?? '')}`)
                    }
                    className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
                  >
                    {t('verifyNow')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPhoneModalOpen(true)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
                >
                  {t('changePhone')}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('changePassword')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
              >
                {t('changePassword')}
              </button>
            </div>
          </div>
        </Card>
      )}

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
              <option value="">· {t('none')} ·</option>
              {tiers.map((t_tier) => (
                <option key={t_tier.id} value={t_tier.id}>
                  {t_tier.name} ({t_tier.kind})
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label={t('shopDescription')} hint={t('shopDescriptionHint')}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`${inputClass} h-auto py-2`}
                placeholder={t('shopDescriptionPlaceholder')}
              />
            </Field>
          </div>

          <Field label={t('shopEmail')}>
            <input
              value={shopEmail}
              onChange={(e) => setShopEmail(e.target.value)}
              type="email"
              className={inputClass}
              placeholder="shop@example.com"
            />
          </Field>

          <Field label={t('shopWebsite')}>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputClass}
              placeholder="https://example.com"
            />
          </Field>

          <Field label={t('shopFacebook')}>
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className={inputClass}
              placeholder="facebook.com/yourshop"
            />
          </Field>

          <Field label={t('shopInstagram')}>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputClass}
              placeholder="@yourshop"
            />
          </Field>

          <Field label={t('shopTiktok')}>
            <input
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              className={inputClass}
              placeholder="@yourshop"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t('shopMapUrl')} hint={t('shopMapUrlHint')}>
              <input
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                className={inputClass}
                placeholder="https://maps.google.com/..."
              />
            </Field>
            {shop?.latitude != null && shop?.longitude != null && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t('shopCoordinates')}: {shop.latitude.toFixed(5)},{' '}
                {shop.longitude.toFixed(5)}
              </p>
            )}
          </div>

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

      {/* Telegram integration */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Send className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('telegramIntegration')}</h3>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {t('telegramIntegrationDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnectTelegram}
            disabled={connectingTelegram}
            className="rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-accent disabled:opacity-60"
          >
            {connectingTelegram ? t('loading') : t('connectTelegramBtn')}
          </button>
        </div>
      </Card>

      {/* Chat bubble visibility */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('chatBubble')}</h3>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {t('chatBubbleDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleChatBubble}
            disabled={togglingChat}
            className={`rounded-lg border px-3.5 py-2 text-sm transition-colors disabled:opacity-60 ${chatBubbleVisible ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border hover:bg-accent'}`}
          >
            {chatBubbleVisible ? t('chatBubbleVisible') : t('chatBubbleHidden')}
          </button>
        </div>
      </Card>

      {/* Support */}
      {support &&
        (support.phone ||
          support.email ||
          support.telegram ||
          support.whatsapp ||
          support.hours ||
          support.url ||
          support.message) && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2">
                <LifeBuoy className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t('supportTitle')}</h3>
                {support.message && (
                  <p className="text-sm text-muted-foreground">{support.message}</p>
                )}
                <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
                  {support.phone && (
                    <div>
                      <dt className="inline font-medium text-foreground">{t('supportPhone')}: </dt>
                      <dd className="inline text-muted-foreground">
                        <a href={`tel:${support.phone}`}>{support.phone}</a>
                      </dd>
                    </div>
                  )}
                  {support.email && (
                    <div>
                      <dt className="inline font-medium text-foreground">{t('supportEmail')}: </dt>
                      <dd className="inline text-muted-foreground">
                        <a href={`mailto:${support.email}`}>{support.email}</a>
                      </dd>
                    </div>
                  )}
                  {support.telegram && (
                    <div>
                      <dt className="inline font-medium text-foreground">{t('supportTelegram')}: </dt>
                      <dd className="inline text-muted-foreground">{support.telegram}</dd>
                    </div>
                  )}
                  {support.whatsapp && (
                    <div>
                      <dt className="inline font-medium text-foreground">{t('supportWhatsApp')}: </dt>
                      <dd className="inline text-muted-foreground">{support.whatsapp}</dd>
                    </div>
                  )}
                  {support.hours && (
                    <div>
                      <dt className="inline font-medium text-foreground">{t('supportHours')}: </dt>
                      <dd className="inline text-muted-foreground">{support.hours}</dd>
                    </div>
                  )}
                </dl>
                {support.url && (
                  <a
                    href={support.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {t('openSupportPage')}
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

      <PhoneChangeModal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onChanged={() => void reloadAccount()}
        t={t}
      />
      <PasswordChangeModal
        open={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        t={t}
      />
    </div>
  );
}
