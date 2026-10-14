import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function calculateDiscount(price: number, compareAtPrice: number): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OTV-${timestamp}-${random}`;
}

export function getStockStatus(stock: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (stock === 0) return 'OUT_OF_STOCK';
  if (stock <= 5) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Normalizes image URLs:
 * - Detects GitHub repository links (github.com/.../blob/...) and raw URLs (raw.githubusercontent.com)
 * - Automatically transforms them into free, high-speed, edge-cached jsDelivr CDN URLs
 * - Leaves relative paths (/catalog/...) and data URIs (data:image/...) untouched
 */
export function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Local static asset or in-browser base64 data URI
  if (trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    // 1. https://github.com/:owner/:repo/blob/:branch/:path or raw
    const ghMatch = trimmed.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/i
    );
    if (ghMatch) {
      const [, owner, repo, branch, filePath] = ghMatch;
      const cleanPath = filePath.split('?')[0].split('#')[0];
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${cleanPath}`;
    }

    // 2. https://raw.githubusercontent.com/:owner/:repo/:branch/:path
    const rawMatch = trimmed.match(
      /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/i
    );
    if (rawMatch) {
      const [, owner, repo, branch, filePath] = rawMatch;
      const cleanPath = filePath.split('?')[0].split('#')[0];
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${cleanPath}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

