import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminAuth } from '@/lib/firebase-admin';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { getProducts, getProductBySlug, getProductByIdOrSlug, getPurchasableProduct } from '@/lib/db/products';
import { GET as adminList, POST as adminCreate, PATCH as adminPatch, DELETE as adminDelete } from '@/app/api/admin/products/route';
import { POST as createOrderRoute } from '@/app/api/orders/route';
import { resetDb, dropDbAndClose, seedProduct, col, jsonRequest } from './helpers/db';
import { NextRequest } from 'next/server';

const TOKENS: Record<string, any> = {
  'tok-admin': { uid: 'admin1', email: 'owner@shop.test', email_verified: true, admin: true },
  'tok-customer': { uid: 'cust1', email: 'cust@shop.test', email_verified: true },
  // Email is on the allow-list but NOT verified: must not be admin.
  'tok-squatter': { uid: 'squat1', email: 'owner2@shop.test', email_verified: false },
};
(adminAuth as any).verifyIdToken = async (t: string) => {
  if (!TOKENS[t]) throw new Error('invalid token');
  return TOKENS[t];
};
process.env.ADMIN_EMAILS = 'owner2@shop.test';

const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const patch = (body: any, token = 'tok-admin') => adminPatch(jsonRequest('/api/admin/products', body, bearer(token), 'PATCH'));
const create = (body: any, token = 'tok-admin') => adminCreate(jsonRequest('/api/admin/products', body, bearer(token)));
const product = async (slug: string) => (await col('products')).findOne({ slug });
const audits = async () => (await col('auditLog')).find({}).toArray();

const withProductionMode = async <T>(fn: () => Promise<T>): Promise<T> => {
  const prev = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = 'production';
  try { return await fn(); } finally { (process.env as any).NODE_ENV = prev; }
};

before(resetDb);
beforeEach(async () => { await resetDb(); await (await col('auditLog')).deleteMany({}); });
after(async () => { await (await col('auditLog')).deleteMany({}); await dropDbAndClose(); });

// ---------- Catalogue integrity ----------

test('INV-16: hidden product is invisible in listings/lookups and cannot be bought', async () => {
  await seedProduct({ slug: 'visible-fig', price: 1000, stock: 5 });
  await seedProduct({ slug: 'hidden-fig', price: 1000, stock: 5 });
  await (await col('products')).updateOne({ slug: 'hidden-fig' }, { $set: { isPublished: false } });

  const list = await getProducts({ limit: 50 });
  assert.deepEqual(list.products.map((p: any) => p.slug), ['visible-fig']);
  assert.equal(await getProductBySlug('hidden-fig'), null);
  assert.equal(await getProductByIdOrSlug('hidden-fig'), null);
  assert.equal(await getPurchasableProduct('hidden-fig'), null);

  const res = await createOrderRoute(jsonRequest('/api/orders', {
    items: [{ productId: 'hidden-fig', quantity: 1 }], paymentMethod: 'cod',
    address: { name: 'A', line1: '12 MG Road', city: 'Pune', pincode: '411001', phone: '9876543210' }, customerPhone: '9876543210',
  }, bearer('tok-customer')));
  assert.equal(res.status, 400);
  assert.equal((await product('hidden-fig')).stock, 5);
});

test('INV-16/18: in production the demo catalogue never substitutes for the database', async () => {
  const demoSlug = MOCK_PRODUCTS[0].slug;
  // Development/test behaviour exists (so local dev works)...
  assert.ok(await getProductBySlug(demoSlug));
  // ...but production must fail closed to "not found" / empty, never to demo data.
  await withProductionMode(async () => {
    assert.equal(await getProductBySlug(demoSlug), null);
    assert.equal(await getProductByIdOrSlug(demoSlug), null);
    const list = await getProducts({ limit: 10 });
    assert.deepEqual(list.products, []);
  });
});

test('INV-16: a deleted product cannot be bought even though it exists in the demo catalogue', async () => {
  const demoSlug = MOCK_PRODUCTS[0].slug;
  assert.equal(await getPurchasableProduct(demoSlug), null);
});

test('getPurchasableProduct rejects non-string, oversized and malformed identifiers', async () => {
  await seedProduct({ slug: 'real', price: 100, stock: 1 });
  for (const bad of [{ $ne: null }, ['real'], 123, null, undefined, 'x'.repeat(500), '']) {
    assert.equal(await getPurchasableProduct(bad as any), null, JSON.stringify(bad));
  }
  assert.ok(await getPurchasableProduct('real'));
});

test('a product with a corrupt price (0, negative, null, string) is not purchasable', async () => {
  const c = await col('products');
  const now = new Date();
  for (const [slug, price] of [['zero', 0], ['neg', -5], ['str', '99'], ['nul', null]] as const) { // NaN omitted: FerretDB cannot store it (guarded by Number.isFinite in code)
    await c.insertOne({ name: slug, slug, price, stock: 5, image: '/x', createdAt: now, updatedAt: now });
    assert.equal(await getPurchasableProduct(slug), null, slug);
  }
});

// ---------- Admin authorization (INV-1, INV-13) ----------

test('admin product API: anonymous, customer and unverified-allow-listed email are all denied', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 3 });
  for (const token of [null, 'tok-customer', 'tok-squatter', 'garbage']) {
    const headers = token ? bearer(token) : {};
    assert.equal((await adminList(new NextRequest('http://localhost/api/admin/products', { headers }))).status, 403, `GET ${token}`);
    assert.equal((await create({ name: 'x', price: 10 }, token as any)).status, 403, `POST ${token}`);
    assert.equal((await patch({ id: 'fig', price: 1 }, token as any)).status, 403, `PATCH ${token}`);
    assert.equal((await adminDelete(new NextRequest('http://localhost/api/admin/products?id=fig', { method: 'DELETE', headers }))).status, 403, `DELETE ${token}`);
  }
  const fig = await product('fig');
  assert.equal(fig.price, 500);
  assert.equal(fig.stock, 3);
  assert.equal((await audits()).length, 0, 'denied requests leave no audit entries and change nothing');
});

// ---------- Admin input validation & mass assignment ----------

test('admin PATCH only writes whitelisted fields (mass assignment)', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 3 });
  const res = await patch({
    id: 'fig', price: 700, role: 'ADMIN', _id: 'hacked', slug: 'stolen', createdAt: '2000-01-01', $set: { stock: 999 }, isAdmin: true,
  });
  assert.equal(res.status, 200);
  const p = await product('fig');
  assert.equal(p.price, 700);
  assert.equal(p.stock, 3);
  assert.equal(p.slug, 'fig');
  assert.equal(p.role, undefined);
  assert.equal(p.isAdmin, undefined);
  assert.notEqual(String(p._id), 'hacked');
});

for (const price of [0, -1, 'abc', 1e12, 99.999, null, {}, [], NaN]) {
  test(`admin price ${JSON.stringify(price)} is rejected and nothing changes`, async () => {
    await seedProduct({ slug: 'fig', price: 500, stock: 3 });
    const res = await patch({ id: 'fig', price });
    assert.equal(res.status, 400);
    assert.equal((await product('fig')).price, 500);
  });
}

for (const stock of [-1, 1.5, 'abc', 1e9, {}]) {
  test(`admin stock ${JSON.stringify(stock)} is rejected and nothing changes`, async () => {
    await seedProduct({ slug: 'fig', price: 500, stock: 3 });
    const res = await patch({ id: 'fig', stock });
    assert.equal(res.status, 400);
    assert.equal((await product('fig')).stock, 3);
  });
}

test('admin PATCH on a product that no longer exists says so (404), not a silent success', async () => {
  const res = await patch({ id: 'ghost', price: 100 });
  assert.equal(res.status, 404);
});

test('admin create: duplicate names get unique slugs instead of a 500', async () => {
  const a = await create({ name: 'Gojo Figure', price: 1999, stock: 4 });
  const b = await create({ name: 'Gojo Figure', price: 2999, stock: 4 });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const slugs = (await (await col('products')).find({}).toArray()).map((p: any) => p.slug);
  assert.equal(new Set(slugs).size, 2);
});

test('admin create validates price and stock', async () => {
  assert.equal((await create({ name: 'x', price: -5 })).status, 400);
  assert.equal((await create({ name: 'x', price: 100, stock: -1 })).status, 400);
  assert.equal((await create({ name: '', price: 100 })).status, 400);
  assert.equal(await (await col('products')).countDocuments({}), 0);
});

// ---------- Inventory safety in the dashboard (INV-10) ----------

test('INV-10: concurrent "-1" clicks never push stock below zero and each unit is counted once', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 3 });
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => patch({ id: 'fig', stockDelta: -1 })));
  const ok = results.filter((r) => r.status === 200).length;
  assert.equal(ok, 3);
  assert.equal(results.filter((r) => r.status === 409).length, 2);
  assert.equal((await product('fig')).stock, 0);
  assert.equal((await product('fig')).isSoldOut, true);
});

test('INV-10: a "+1" click does not overwrite stock that changed meanwhile', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 10 });
  // A customer order takes 4 units after the owner's page loaded (it still shows 10).
  await (await col('products')).updateOne({ slug: 'fig' }, { $inc: { stock: -4 } });
  const res = await patch({ id: 'fig', stockDelta: 1 });
  assert.equal((await res.json()).stock, 7);
});

test('stockDelta must be a whole number of reasonable size', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 10 });
  for (const stockDelta of [1.5, '2', 1e6, NaN]) {
    assert.equal((await patch({ id: 'fig', stockDelta })).status, 400, String(stockDelta));
  }
  assert.equal((await product('fig')).stock, 10);
});

// ---------- Owner safety: hide/publish + audit trail (INV-14) ----------

test('owner can hide and re-show a product and every privileged change is audited with the actor', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 3 });
  assert.equal((await patch({ id: 'fig', isPublished: false })).status, 200);
  assert.equal(await getProductBySlug('fig'), null);
  assert.equal((await patch({ id: 'fig', isPublished: true })).status, 200);
  assert.ok(await getProductBySlug('fig'));
  await patch({ id: 'fig', price: 650 });
  await patch({ id: 'fig', stockDelta: 2 });
  await adminDelete(new NextRequest('http://localhost/api/admin/products?id=fig', { method: 'DELETE', headers: bearer('tok-admin') }));

  const log = await audits();
  const actions = log.map((a: any) => a.action).sort();
  assert.deepEqual(actions, ['product.delete', 'product.stock_adjust', 'product.update', 'product.update', 'product.update']);
  assert.ok(log.every((a: any) => a.actor === 'owner@shop.test' && a.target === 'fig' && a.at instanceof Date));
  const priceChange = log.find((a: any) => a.detail?.price);
  assert.deepEqual(priceChange.detail.price, { from: 500, to: 650 });
});

test('isPublished must be a boolean', async () => {
  await seedProduct({ slug: 'fig', price: 500, stock: 3 });
  assert.equal((await patch({ id: 'fig', isPublished: 'false' })).status, 400);
  assert.equal((await patch({ id: 'fig', isPublished: 0 })).status, 400);
});

test('SEC-RES: user address collection is capped at 15 addresses to prevent resource exhaustion', async () => {
  const { POST: addressPost } = await import('@/app/api/addresses/route');
  const baseAddr = {
    fullName: 'Test Customer',
    phone: '9876543210',
    addressLine1: '123 MG Road Flat 4B',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560001',
    country: 'India',
  };

  for (let i = 1; i <= 15; i++) {
    const res = await addressPost(jsonRequest('/api/addresses', { ...baseAddr, addressLine1: `123 MG Road Flat ${i}` }, bearer('tok-customer')));
    assert.equal(res.status, 200, `Address ${i} should succeed`);
  }

  // 16th address must be rejected with 400
  const res16 = await addressPost(jsonRequest('/api/addresses', { ...baseAddr, addressLine1: '123 MG Road Flat 16' }, bearer('tok-customer')));
  assert.equal(res16.status, 400);
  const data = await res16.json();
  assert.match(data.error, /Maximum 15 saved addresses/);
});

