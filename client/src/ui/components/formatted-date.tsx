import { format, parseISO, isValid } from 'date-fns';
import { useI18n } from '../../lib/i18n';
import { toEth, ethMonths } from '../../lib/ethiopian-date-utils';

type Calendar = 'gregorian' | 'ethiopian';

interface Props {
  iso: string | null | undefined;
  calendar?: Calendar;
  className?: string;
}

export function FormattedDate({ iso, calendar: calProp, className }: Props) {
  const { lang } = useI18n();
  const cal = calProp ?? (lang === 'am' ? 'ethiopian' : 'gregorian');

  if (!iso) return <span className={className}>—</span>;
  const d = parseISO(iso);
  if (!isValid(d)) return <span className={className}>{iso}</span>;

  if (cal === 'ethiopian') {
    const et = toEth(d);
    return <span className={className}>{ethMonths[et.Month - 1]} {et.Day}, {et.Year}</span>;
  }

  return <span className={className}>{format(d, 'MMM d, yyyy')}</span>;
}

export function useFormattedDate() {
  const { lang } = useI18n();
  return (iso: string | null | undefined, override?: Calendar): string => {
    const cal = override ?? (lang === 'am' ? 'ethiopian' : 'gregorian');
    if (!iso) return '—';
    const d = parseISO(iso);
    if (!isValid(d)) return iso ?? '—';
    if (cal === 'ethiopian') {
      const et = toEth(d);
      return `${ethMonths[et.Month - 1]} ${et.Day}, ${et.Year}`;
    }
    return format(d, 'MMM d, yyyy');
  };
}
