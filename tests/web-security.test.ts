import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { jsonLdString } from '@/lib/json-ld';
import { rateLimit, __resetRateLimitsForTests } from '@/lib/rate-limit';
import nextConfig from '../next.config';

test('SEC-09: open redirect targets are rejected', () => {
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/%0d%0aSet-Cookie:x', '\\\\evil.com', 'evil.com', '', null, undefined, '/a\nb', 'x'.repeat(600), '/\tfoo']) {
    assert.equal(safeRedirectPath(bad as any), '/', String(bad));
  }
  for (const good of ['/', '/account', '/checkout?x=1', '/admin/orders#top']) assert.equal(safeRedirectPath(good), good);
});

test('SEC-08: JSON-LD cannot break out of its script tag', () => {
  const out = jsonLdString({ name: '</script><script>alert(1)</script>', d: 'a&b ' });
  assert.ok(!out.includes('<'), out);
  assert.ok(!out.includes('>'));
  assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>', d: 'a&b ' });
});

test('rate limiter blocks after the limit, is per IP, and resets after the window', () => {
  __resetRateLimitsForTests();
  const req = (ip: string) => new NextRequest('http://x/api', { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(req('1.1.1.1'), 'k', 3, 60_000, t0).ok, true);
  const blocked = rateLimit(req('1.1.1.1'), 'k', 3, 60_000, t0 + 1000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter > 0);
  assert.equal(rateLimit(req('2.2.2.2'), 'k', 3, 60_000, t0).ok, true, 'other IPs unaffected');
  assert.equal(rateLimit(req('1.1.1.1'), 'k', 3, 60_000, t0 + 61_000).ok, true, 'window resets');
});

test('security headers are configured (HSTS, CSP, geolocation allowed for checkout, API no-store)', async () => {
  const groups = await (nextConfig as any).headers();
  const all = groups.find((g: any) => g.source === '/(.*)').headers as { key: string; value: string }[];
  const h = (k: string) => all.find((x) => x.key === k)?.value || '';
  assert.match(h('Strict-Transport-Security'), /max-age=\d{8,}/);
  assert.match(h('Content-Security-Policy'), /frame-ancestors 'self'/);
  assert.match(h('Content-Security-Policy'), /object-src 'none'/);
  assert.ok(h('Content-Security-Policy-Report-Only').includes('checkout.razorpay.com'));
  assert.match(h('Permissions-Policy'), /geolocation=\(self\)/);
  assert.equal(all.find((x) => x.key === 'X-XSS-Protection'), undefined);
  const api = groups.find((g: any) => g.source === '/api/(.*)');
  assert.equal(api.headers[0].value, 'no-store');
});
