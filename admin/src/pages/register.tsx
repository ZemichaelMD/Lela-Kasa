import { ArrowRight, Check, Eye, EyeOff, Loader, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/lib/data';
import { sdk, tokenStore } from '@/lib/sdk';
import { ThemeToggle } from '@/components/theme';
import { useI18n } from '@/lib/i18n';

const inputClass =
  'h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Min. 8 characters', met: password.length >= 8 },
    { label: 'Contains lowercase', met: /[a-z]/.test(password) },
    { label: 'Contains uppercase', met: /[A-Z]/.test(password) },
    { label: 'Contains number', met: /[0-9]/.test(password) },
    { label: 'Contains symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const classesMet = checks.filter((c) => c.met).length - 1;
  const minClassesMet = classesMet >= 3;

  return (
    <ul className="space-y-1 pt-1">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-1.5 text-[11px]">
          {c.met ? <Check className="h-3 w-3 shrink-0 text-success" /> : <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
          <span className={c.met ? 'text-success' : 'text-muted-foreground'}>{c.label}</span>
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-[11px]">
        {minClassesMet ? <Check className="h-3 w-3 shrink-0 text-success" /> : <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
        <span className={minClassesMet ? 'text-success' : 'text-muted-foreground'}>
          At least 3 of: lowercase, uppercase, numbers, symbols
        </span>
      </li>
    </ul>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<{ registrationOpen: boolean; passwordMinLength: number; appName: string } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    sdk.auth.getPublicConfig()
      .then(setConfig)
      .catch(() => setError('Could not load registration settings'))
      .finally(() => setLoadingConfig(false));
  }, []);

  useEffect(() => {
    if (config && !config.registrationOpen) {
      setError('Registration is currently closed. Please contact the administrator.');
    }
  }, [config]);

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (pw.length > 128) return 'Password must be at most 128 characters';
    const classes = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
    if (classes < 3) return 'Use at least 3 of: lowercase, uppercase, numbers, symbols';
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Email is required'); return; }
    if (!phone.trim()) { setError('Phone number is required'); return; }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }

    setSubmitting(true);
    try {
      const res = await sdk.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        shopName: shopName.trim(),
        phone: phone.trim(),
      });
      tokenStore.setTokens(res.accessToken, res.refreshToken);
      navigate(`/verify?phone=${encodeURIComponent(phone.trim())}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registrationFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingConfig) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (config && !config.registrationOpen) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">{config.appName}</h1>
          <p className="text-sm text-muted-foreground">Registration is currently closed. Please contact the administrator to create an account.</p>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-50 via-background to-background px-4 py-12 dark:from-brand-950/30">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">{t('createOwnerAccount')}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                {t('fullName')}
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Selam Tadesse"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="shopName" className="text-sm font-medium">
                {t('shopName')}
              </label>
              <input
                id="shopName"
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="My Beverage Shop"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium">
                {t('phoneNumber')} *
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 9XX XXX XXX"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? t('hidePassword') as string : t('showPassword') as string}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(passwordFocused || password.length > 0) && (
                <PasswordStrength password={password} />
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? t('hidePassword') as string : t('showPassword') as string}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? t('creatingAccount') : (<>{t('createAccount')} <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
