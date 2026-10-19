import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authOptions } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/firebase-admin';
import { resetDb, dropDbAndClose, col } from './helpers/db';

// The credentials provider's real authorize() lives under .options in next-auth v4.
const authorize = (authOptions.providers[0] as any).options.authorize as (c: any) => Promise<any>;
const ADMIN = 'owner@shop.test';
const realFetch = globalThis.fetch;

/** Simulate Firebase's REST API: a password account that exists, with a given verification state. */
function fakeFirebase(account: { uid: string; email: string; emailVerified: boolean }) {
  globalThis.fetch = (async (url: any) => {
    const u = String(url);
    if (u.includes('accounts:signInWithPassword')) {
      // `registered: true` is returned for every successful password sign-in.
      return new Response(JSON.stringify({ localId: account.uid, email: account.email, registered: true, idToken: 'fresh-token' }), { status: 200 });
    }
    if (u.includes('accounts:lookup')) {
      return new Response(JSON.stringify({ users: [{ localId: account.uid, email: account.email, emailVerified: account.emailVerified }] }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}

before(async () => {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
  process.env.ADMIN_EMAILS = ADMIN;
  await resetDb();
});
beforeEach(resetDb);
afterEach(() => { globalThis.fetch = realFetch; });
after(dropDbAndClose);

test('SEC-02/INV-1: password account squatting an admin email without verifying it gets USER, not ADMIN', async () => {
  fakeFirebase({ uid: 'attacker', email: ADMIN, emailVerified: false });
  const user = await authorize({ email: ADMIN, password: 'pw' });
  assert.ok(user, 'login itself still works');
  assert.equal(user.role, 'USER');
  const stored = await (await col('users')).findOne({ firebaseUid: 'attacker' });
  assert.equal(stored?.role ?? 'USER', 'USER');
});

test('SEC-02: the real owner with a verified admin email gets ADMIN', async () => {
  fakeFirebase({ uid: 'owner', email: ADMIN, emailVerified: true });
  const user = await authorize({ email: ADMIN, password: 'pw' });
  assert.equal(user.role, 'ADMIN');
});

test('INV-1: client-supplied role/name fields cannot grant ADMIN', async () => {
  fakeFirebase({ uid: 'c1', email: 'customer@shop.test', emailVerified: true });
  const user = await authorize({ email: 'customer@shop.test', password: 'pw', role: 'ADMIN', authType: 'admin' });
  assert.equal(user.role, 'USER');
});

test('identity email comes from Firebase, not from the typed email', async () => {
  fakeFirebase({ uid: 'c2', email: 'real@shop.test', emailVerified: true });
  const user = await authorize({ email: ADMIN, password: 'pw' });
  assert.equal(user.email, 'real@shop.test');
  assert.equal(user.role, 'USER');
});

test('only the Firebase-verified credentials provider exists (no unverified OAuth path into sessions)', () => {
  assert.deepEqual(authOptions.providers.map((p: any) => p.id), ['credentials']);
});

test('wrong password is denied', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'INVALID_PASSWORD' } }), { status: 400 })) as typeof fetch;
  assert.equal(await authorize({ email: ADMIN, password: 'bad' }), null);
});

test('isAllowedAdminEmail fails closed for unverified emails and empty config', () => {
  assert.equal(isAllowedAdminEmail(ADMIN, false), false);
  assert.equal(isAllowedAdminEmail(ADMIN, true), true);
  const saved = process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS;
  assert.equal(isAllowedAdminEmail(ADMIN, true), false);
  process.env.ADMIN_EMAILS = saved;
});
