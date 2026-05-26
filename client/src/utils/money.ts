declare const __centsTag: unique symbol;
export type Cents = number & { readonly [__centsTag]: true };

export function toCents(value: number): Cents {
  return Math.round(value) as Cents;
}

function detectLang(): 'en' | 'am' {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem('kasa_lang') as 'en' | 'am') ?? 'en';
}

function numberWithCommas(n: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatMoneyCents(
  cents: number | null | undefined,
  lang?: 'en' | 'am',
): string {
  const safe = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  const amount = safe / 100;
  const l = lang ?? detectLang();
  const formatted = numberWithCommas(amount);
  return l === 'am' ? `${formatted} ብር` : `ETB ${formatted}`;
}
