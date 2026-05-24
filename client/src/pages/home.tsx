import { Link } from 'react-router-dom';
import { BarChart3, Box, CreditCard, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/lang-toggle';
import { APP_NAME } from '@/lib/data';
import { ThemeToggle } from '@/components/theme';

const features = [
  { icon: ShoppingBag, titleKey: 'feature1Title', descKey: 'feature1Desc' },
  { icon: Users, titleKey: 'feature2Title', descKey: 'feature2Desc' },
  { icon: Box, titleKey: 'feature3Title', descKey: 'feature3Desc' },
  { icon: CreditCard, titleKey: 'feature4Title', descKey: 'feature4Desc' },
  { icon: BarChart3, titleKey: 'feature5Title', descKey: 'feature5Desc' },
  { icon: TrendingUp, titleKey: 'feature6Title', descKey: 'feature6Desc' },
] as const;

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-base font-bold">{APP_NAME}</span>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('signIn')}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
          K
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{t('heroTitle')}</h1>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">{t('heroSubtitle')}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {t('getStarted')}
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            {t('signIn')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="mb-10 text-center text-xl font-semibold">{t('featuresTitle')}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold">{t(titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        {APP_NAME} &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
