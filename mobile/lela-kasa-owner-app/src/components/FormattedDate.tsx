import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { toEth, ethMonths } from '../lib/ethiopian-date-utils';

type Calendar = 'gregorian' | 'ethiopian';

interface Props {
  iso: string | null | undefined;
  style?: TextStyle;
  calendar?: Calendar;
}

function parseIso(iso: string): Date | null {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatEt(d: Date): string {
  const et = toEth(d);
  return `${ethMonths[et.Month - 1]} ${et.Day}, ${et.Year}`;
}

function formatGr(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FormattedDate({ iso, style, calendar: calProp }: Props) {
  const { language } = useLanguage();
  const cal = calProp ?? (language === 'am' ? 'ethiopian' : 'gregorian');

  if (!iso) return <Text style={style}>—</Text>;
  const d = parseIso(iso);
  if (!d) return <Text style={style}>{iso}</Text>;

  return <Text style={style}>{cal === 'ethiopian' ? formatEt(d) : formatGr(d)}</Text>;
}

export function useFormattedDate() {
  const { language } = useLanguage();
  const cal: Calendar = language === 'am' ? 'ethiopian' : 'gregorian';

  return (iso: string | null | undefined, override?: Calendar): string => {
    const c = override ?? cal;
    if (!iso) return '—';
    const d = parseIso(iso);
    if (!d) return iso ?? '—';
    return c === 'ethiopian' ? formatEt(d) : formatGr(d);
  };
}
