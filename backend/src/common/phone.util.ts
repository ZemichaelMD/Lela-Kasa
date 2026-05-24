import { BadRequestException } from '@nestjs/common';

export const PHONE_FORMAT_MESSAGE =
  'Invalid phone number. Use a format like 0927646246, +251927646246, 251927646246 or 927646246.';

/**
 * Extracts the 9-digit national part of an Ethiopian mobile number, or null
 * when the input is not a recognised format. Accepts 0927646246,
 * +251927646246, 251927646246 and 927646246 (spaces/dashes tolerated).
 */
function nationalPart(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  let national: string;
  if (digits.startsWith('251')) national = digits.slice(3);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;
  // Ethiopian mobile numbers are 9 digits starting with 9.
  return /^9\d{8}$/.test(national) ? national : null;
}

/** True when `raw` is an acceptable Ethiopian mobile number. */
export function isValidEthiopianPhone(raw: string): boolean {
  return nationalPart(raw) !== null;
}

/**
 * Returns the canonical `2519XXXXXXXX` form (12 digits, no `+`).
 * Throws a 400 BadRequestException when the input is not a valid number.
 */
export function normalizeEthiopianPhone(raw: string): string {
  const national = nationalPart(raw);
  if (!national) throw new BadRequestException(PHONE_FORMAT_MESSAGE);
  return `251${national}`;
}

/**
 * Every stored-format variant of a number, so database lookups tolerate
 * historically inconsistent formats (some rows store 0927…, others +251927…).
 */
export function ethiopianPhoneVariants(raw: string): string[] {
  const national = nationalPart(raw);
  if (!national) return [(raw || '').trim()];
  return Array.from(
    new Set([
      `251${national}`,
      `+251${national}`,
      `0${national}`,
      national,
      (raw || '').trim(),
    ]),
  );
}
