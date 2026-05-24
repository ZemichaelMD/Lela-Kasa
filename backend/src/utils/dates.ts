/**
 * Date helpers — timezone-aware, using date-fns and date-fns-tz.
 */

import { format, formatISO, parseISO, addMinutes, differenceInMinutes, isWithinInterval } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Africa/Addis_Ababa';

/** Get current time in a given timezone */
export function nowInTz(tz = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), tz);
}

/** Format a date to ISO string */
export function toIso(date: Date): string {
  return formatISO(date);
}

/** Parse an ISO date string */
export function fromIso(iso: string): Date {
  return parseISO(iso);
}

/**
 * Check whether a restaurant is "open now" given its opening hours.
 *
 * @param hours - Array of {dayOfWeek: 0-6, opensAt: "HH:mm", closesAt: "HH:mm", isClosed: boolean}
 * @param tz - Restaurant timezone (e.g. "Africa/Addis_Ababa")
 * @param at - The moment to check (defaults to now)
 */
export function isOpenNow(
  hours: Array<{
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
    isClosed: boolean;
  }>,
  tz = DEFAULT_TIMEZONE,
  at?: Date,
): boolean {
  const now = toZonedTime(at ?? new Date(), tz);
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentTime = format(now, 'HH:mm');

  const todayHours = hours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (todayHours.length === 0) return false;

  for (const slot of todayHours) {
    if (slot.isClosed) continue;
    if (currentTime >= slot.opensAt && currentTime < slot.closesAt) return true;
    // Handle overnight slots (e.g. 22:00–02:00)
    if (slot.closesAt < slot.opensAt) {
      if (currentTime >= slot.opensAt || currentTime < slot.closesAt) return true;
    }
  }
  return false;
}

/** Compute ETA datetime given minutes from now */
export function etaFromNow(minutes: number, tz = DEFAULT_TIMEZONE): Date {
  const nowUtc = new Date();
  return addMinutes(nowUtc, minutes);
}

/** Format minutes as human-readable duration ("25 min", "1 hr 30 min") */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

export { toZonedTime, fromZonedTime, differenceInMinutes, isWithinInterval, format };
