/**
 * Slug helpers for URL-safe identifiers.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // strip non-alphanumeric
    .trim()
    .replace(/[\s_]+/g, '-')         // spaces/underscores → hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '');          // strip leading/trailing hyphens
}

/**
 * Given a base slug and a function that checks whether a slug is already taken,
 * returns a unique slug by appending a numeric suffix if needed.
 *
 * @example
 *   const slug = await ensureUniqueSlug('my-restaurant', (s) => db.restaurant.findFirst({ where: { slug: s } }));
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean | unknown>,
): Promise<string> {
  const candidate = slugify(base);
  if (!(await exists(candidate))) return candidate;

  let i = 2;
  while (i < 1000) {
    const suffixed = `${candidate}-${i}`;
    if (!(await exists(suffixed))) return suffixed;
    i++;
  }
  throw new Error(`Could not find unique slug for base: "${base}"`);
}
