/**
 * Best-effort extraction of latitude/longitude from a pasted Google Maps URL.
 *
 * Full Maps URLs embed coordinates in a few well-known shapes; shortened links
 * (maps.app.goo.gl, goo.gl/maps) do not, so `resolveLatLngFromMapUrl` follows
 * the redirect to the expanded URL before parsing. Both are best-effort: if no
 * coordinates can be found the caller simply keeps the URL without coords.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const COORD_PATTERNS: RegExp[] = [
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // /maps/@9.03,38.74,15z
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // place data block
  /[?&](?:q|ll|center|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // ?q=9.03,38.74
  /\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // /9.03,38.74
];

function valid(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Synchronously parses coordinates embedded in a full Maps URL. */
export function parseLatLngFromMapUrl(url: string): LatLng | null {
  if (!url) return null;
  for (const re of COORD_PATTERNS) {
    const m = url.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/** True for Google's shortened map links, which must be expanded first. */
function isShortMapLink(url: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/.test(url);
}

/**
 * Resolves coordinates from any Google Maps URL, expanding shortened links via
 * an HTTP redirect when needed. Returns null when nothing can be extracted.
 */
export async function resolveLatLngFromMapUrl(
  url: string,
): Promise<LatLng | null> {
  if (!url) return null;

  const direct = parseLatLngFromMapUrl(url);
  if (direct) return direct;

  if (!isShortMapLink(url)) return null;

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    // `res.url` is the final URL after redirects; it carries the coordinates.
    return parseLatLngFromMapUrl(res.url);
  } catch {
    return null;
  }
}
