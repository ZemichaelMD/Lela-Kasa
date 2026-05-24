/**
 * Money helpers — all money is integer cents (ETB minor units).
 * Never use floats for money; always use Cents.
 */

declare const __centsTag: unique symbol;
export type Cents = number & { readonly [__centsTag]: true };

export function toCents(value: number): Cents {
  return Math.round(value) as Cents;
}

export function formatCents(
  cents: number,
  currency = 'ETB',
  locale = 'en-ET',
): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function parseMoneyToCents(input: string | number): Cents {
  if (typeof input === 'number') return toCents(input * 100);
  const cleaned = input.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) throw new Error(`Cannot parse money value: "${input}"`);
  return toCents(parsed * 100);
}

export function addCents(a: number, b: number): Cents {
  return toCents(a + b);
}

export function sumCents(values: number[]): Cents {
  return toCents(values.reduce((acc, v) => acc + v, 0));
}

/** Apply a percentage discount. bps = basis points (100 bps = 1%) */
export function applyBps(cents: number, bps: number): Cents {
  return toCents(Math.round(cents * (bps / 10000)));
}

export function applyPercentage(cents: number, percent: number): Cents {
  return toCents(Math.round(cents * (percent / 100)));
}

export function subtractCents(a: number, b: number): Cents {
  return toCents(a - b);
}

export function formatMoneyCents(
  cents: number | null | undefined,
  currency = 'ETB',
): string {
  const safe = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  return `${currency} ${(safe / 100).toFixed(2)}`;
}
