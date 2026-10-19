import type { NextRequest } from 'next/server';

/**
 * Small fixed-window limiter keyed by client IP.
 * LIMITATION: state is per server instance. On serverless platforms each instance counts separately,
 * so this is defence-in-depth against casual abuse, NOT a substitute for a platform rule
 * (Vercel Firewall rate limiting) on login, coupon and checkout endpoints.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 5000;

export function clientIp(request: NextRequest): string {
  // Platform-set headers first: x-vercel-forwarded-for / x-real-ip cannot be forged by the client
  // on Vercel, whereas the first x-forwarded-for entry can be on other hosts.
  const platform = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip');
  if (platform) return platform.split(',')[0].trim();
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : '') || 'unknown';
}

export function rateLimit(request: NextRequest, name: string, limit: number, windowMs = 60_000, now = Date.now()): { ok: boolean; retryAfter: number } {
  const key = `${name}:${clientIp(request)}`;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

export function __resetRateLimitsForTests() { buckets.clear(); }
