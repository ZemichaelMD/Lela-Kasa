import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold">{t('pageNotFound')}</h1>
      <p className="max-w-sm text-muted-foreground">{t('pageNotFoundDesc')}</p>
      <Link
        to="/dashboard"
        className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t('backToDashboard')}
      </Link>
    </div>
  );
}
