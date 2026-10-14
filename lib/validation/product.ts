export interface ProductInputIssue {
  field: string;
  message: string;
}

export const MAX_STOCK = 100000;
export const MAX_PRICE_RUPEES = 1000000;

/** Rupee price with at most 2 decimals, positive, bounded. Returns the number or an issue message. */
export function parsePrice(value: unknown, field = 'price'): { value: number } | { error: string } {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return { error: `${field} must be a number` };
  if (n <= 0) return { error: `${field} must be greater than zero` };
  if (n > MAX_PRICE_RUPEES) return { error: `${field} is too large` };
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return { error: `${field} can have at most 2 decimal places` };
  return { value: Math.round(n * 100) / 100 };
}

export function parseStock(value: unknown, field = 'stock'): { value: number } | { error: string } {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n)) return { error: `${field} must be a whole number` };
  if (n < 0) return { error: `${field} cannot be negative` };
  if (n > MAX_STOCK) return { error: `${field} is too large` };
  return { value: n };
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' ? v.trim().slice(0, max) : undefined;

/** The only fields an admin may change on an existing product through the API. */
export function sanitizeProductPatch(body: Record<string, unknown>): { patch: Record<string, unknown>; issues: ProductInputIssue[] } {
  const patch: Record<string, unknown> = {};
  const issues: ProductInputIssue[] = [];

  for (const key of ['name', 'description', 'characterName', 'animeName', 'brandName', 'categoryName']) {
    if (body[key] !== undefined) {
      const v = str(body[key], key === 'description' ? 5000 : 200);
      if (v === undefined || (key === 'name' && !v)) issues.push({ field: key, message: `${key} must be text` });
      else patch[key] = v;
    }
  }
  if (body.price !== undefined) {
    const r = parsePrice(body.price);
    if ('error' in r) issues.push({ field: 'price', message: r.error });
    else patch.price = r.value;
  }
  if (body.compareAtPrice !== undefined && body.compareAtPrice !== null && body.compareAtPrice !== '') {
    const r = parsePrice(body.compareAtPrice, 'compareAtPrice');
    if ('error' in r) issues.push({ field: 'compareAtPrice', message: r.error });
    else patch.compareAtPrice = r.value;
  } else if (body.compareAtPrice === null || body.compareAtPrice === '') {
    patch.compareAtPrice = null;
  }
  if (body.stock !== undefined) {
    const r = parseStock(body.stock);
    if ('error' in r) issues.push({ field: 'stock', message: r.error });
    else patch.stock = r.value;
  }
  if (body.isPublished !== undefined) {
    if (typeof body.isPublished !== 'boolean') issues.push({ field: 'isPublished', message: 'isPublished must be true or false' });
    else patch.isPublished = body.isPublished;
  }
  for (const flag of ['isNewArrival', 'isBestSeller', 'isLimitedEdition', 'isPreOrder', 'isFeatured']) {
    if (body[flag] !== undefined) {
      if (typeof body[flag] !== 'boolean') issues.push({ field: flag, message: `${flag} must be true or false` });
      else patch[flag] = body[flag];
    }
  }
  if (typeof body.image === 'string') patch.image = body.image.trim().slice(0, 1000);
  if (Array.isArray(body.images)) {
    patch.images = body.images.filter((i): i is string => typeof i === 'string').slice(0, 12).map((i) => i.trim().slice(0, 1000));
  }
  if (typeof patch.price === 'number' && typeof patch.compareAtPrice === 'number' && patch.compareAtPrice <= patch.price) {
    patch.compareAtPrice = null;
  }
  return { patch, issues };
}
