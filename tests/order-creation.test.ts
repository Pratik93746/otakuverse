import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminAuth } from '@/lib/firebase-admin';
import { POST as createOrderRoute } from '@/app/api/orders/route';
import { resetDb, dropDbAndClose, seedProduct, col, jsonRequest } from './helpers/db';

// Authenticate test requests by stubbing token verification on the real Admin SDK instance.
const USERS: Record<string, { uid: string; email: string; email_verified: boolean }> = {
  'token-alice': { uid: 'alice', email: 'alice@shop.test', email_verified: true },
};
(adminAuth as any).verifyIdToken = async (t: string) => {
  const u = USERS[t];
  if (!u) throw new Error('invalid token');
  return u;
};

const address = { name: 'Alice', line1: '12 MG Road', city: 'Bengaluru', state: 'KA', pincode: '560001', phone: '9876543210' };
const order = (body: any, token: string | null = 'token-alice') =>
  createOrderRoute(jsonRequest('/api/orders', { address, customerPhone: '9876543210', paymentMethod: 'cod', ...body },
    token ? { authorization: `Bearer ${token}` } : {}));
const stockOf = async (slug: string) => (await (await col('products')).findOne({ slug })).stock;

before(resetDb);
beforeEach(resetDb);
after(dropDbAndClose);

test('SEC-03: anonymous callers cannot create orders', async () => {
  await seedProduct({ slug: 'mug', price: 500, stock: 5 });
  const res = await order({ items: [{ productId: 'mug', quantity: 1 }] }, null);
  assert.equal(res.status, 401);
  assert.equal(await stockOf('mug'), 5);
  assert.equal(await (await col('orders')).countDocuments({}), 0);
});

test('INV-3: client-supplied price/total/discount never override database pricing', async () => {
  await seedProduct({ slug: 'katana', price: 4999, stock: 3 });
  const res = await order({
    items: [{ productId: 'katana', quantity: 2, price: 1, purchasePrice: 1, subtotal: 1 }],
    total: 1, subtotal: 1, discount: 9000, shipping: -500,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 9998);
  const saved = await (await col('orders')).findOne({ orderNumber: body.orderNumber });
  assert.equal(saved.total, 9998);
  assert.equal(saved.discount, 0);
  assert.equal(saved.items[0].purchasePrice, 4999);
});

test('PAY-03: duplicate lines are merged before the stock check (no oversell)', async () => {
  await seedProduct({ slug: 'last', price: 800, stock: 1 });
  const res = await order({ items: [{ productId: 'last', quantity: 1 }, { productId: 'last', quantity: 1 }] });
  assert.equal(res.status, 400);
  assert.equal(await stockOf('last'), 1);
});

test('INV-8: concurrent COD checkouts for the last unit — exactly one succeeds, stock ends at 0', async () => {
  await seedProduct({ slug: 'one-left', price: 999, stock: 1 });
  const results = await Promise.all([1, 2, 3, 4].map(() => order({ items: [{ productId: 'one-left', quantity: 1 }] })));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses.filter((s) => s === 200).length, 1, `statuses ${statuses}`);
  assert.ok(statuses.every((s) => s === 200 || s === 400 || s === 409), `no 5xx: ${statuses}`);
  assert.equal(await stockOf('one-left'), 0);
  assert.equal(await (await col('orders')).countDocuments({}), 1);
});

test('INV-8/INV-13: racing multi-item COD orders never leak or double-take stock', async () => {
  for (let round = 0; round < 5; round++) {
    await resetDb();
    await seedProduct({ slug: 'plenty', price: 300, stock: 10 });
    await seedProduct({ slug: 'scarce', price: 300, stock: 1 });
    const multi = { items: [{ productId: 'plenty', quantity: 2 }, { productId: 'scarce', quantity: 1 }] };
    const single = { items: [{ productId: 'scarce', quantity: 1 }] };
    const results = await Promise.all([order(multi), order(single), order(multi)]);
    assert.ok(results.every((r) => r.status < 500), `no 5xx: ${results.map((r) => r.status)}`);
    const orders = await (await col('orders')).find({}).toArray();
    const multiOk = orders.filter((o: any) => o.items.length === 2).length;
    assert.equal(orders.length, 1, 'only one order can get the scarce unit');
    assert.equal(await stockOf('scarce'), 0);
    assert.equal(await stockOf('plenty'), 10 - 2 * multiOk, 'plenty stock reflects exactly the successful orders');
  }
});

for (const quantity of [0, -3, 1.5, '2abc', 1e9, null]) {
  test(`quantity ${JSON.stringify(quantity)} is rejected`, async () => {
    await seedProduct({ slug: 'q', price: 100, stock: 50 });
    const res = await order({ items: [{ productId: 'q', quantity }] });
    assert.equal(res.status, 400);
    assert.equal(await stockOf('q'), 50);
  });
}

test('PAY-08: products not in the database (demo catalog / deleted) cannot be bought', async () => {
  const res = await order({ items: [{ productId: 'gojo-satoru-figure', quantity: 1 }] });
  assert.equal(res.status, 400);
});

test('PAY-08: operator-injection and regex product references are rejected', async () => {
  await seedProduct({ slug: 'real', price: 100, stock: 5 });
  for (const productId of [{ $ne: null }, '.*', { $regex: '.*' }]) {
    const res = await order({ items: [{ productId, name: '.*', quantity: 1 }] });
    assert.equal(res.status, 400, `productId ${JSON.stringify(productId)}`);
  }
  assert.equal(await stockOf('real'), 5);
});

test('INV-4: invalid, non-string, or below-minimum coupons are rejected, not silently stored', async () => {
  await seedProduct({ slug: 'poster', price: 1000, stock: 10 });
  for (const couponCode of ['BOGUS', { $ne: null }, 'GOJO500']) {
    const res = await order({ items: [{ productId: 'poster', quantity: 1 }], couponCode });
    assert.equal(res.status, 400, `coupon ${JSON.stringify(couponCode)}`);
  }
  assert.equal(await (await col('orders')).countDocuments({}), 0);
});

test('INV-4: valid coupon is applied server-side and capped', async () => {
  await seedProduct({ slug: 'statue', price: 30000, stock: 2 });
  const res = await order({ items: [{ productId: 'statue', quantity: 1 }], couponCode: 'otaku10', discount: 29999 });
  const body = await res.json();
  assert.equal(body.total, 29000); // 10% capped at 1000
});

test('INV-4: once-per-customer coupon cannot be reused', async () => {
  await seedProduct({ slug: 'set', price: 2500, stock: 10 });
  const first = await order({ items: [{ productId: 'set', quantity: 1 }], couponCode: 'WELCOME' });
  assert.equal(first.status, 200);
  const second = await order({ items: [{ productId: 'set', quantity: 1 }], couponCode: 'WELCOME' });
  assert.equal(second.status, 400);
});

test('SEC-03: open COD orders per customer are capped', async () => {
  await seedProduct({ slug: 'keychain', price: 199, stock: 100 });
  const statuses: number[] = [];
  for (let i = 0; i < 4; i++) statuses.push((await order({ items: [{ productId: 'keychain', quantity: 1 }] })).status);
  assert.deepEqual(statuses, [200, 200, 200, 429]);
  assert.equal(await stockOf('keychain'), 97);
});

test('500 responses do not leak internal error messages', async () => {
  const res = await createOrderRoute(jsonRequest('/api/orders', 'not json', { authorization: 'Bearer token-alice' }));
  assert.equal(res.status, 400);
});

test('ORD-IDEMP: duplicate submission with same idempotencyKey returns existing order and does not decrement stock twice', async () => {
  await seedProduct({ slug: 'idemp-item', price: 1000, stock: 5 });
  const key = 'idem_key_' + Date.now();
  const req1 = await order({ items: [{ productId: 'idemp-item', quantity: 1 }], idempotencyKey: key });
  assert.equal(req1.status, 200);
  const body1 = await req1.json();
  assert.ok(body1.orderNumber);
  assert.equal(await stockOf('idemp-item'), 4);

  // Replay with exact same idempotencyKey
  const req2 = await order({ items: [{ productId: 'idemp-item', quantity: 1 }], idempotencyKey: key });
  assert.equal(req2.status, 200);
  const body2 = await req2.json();
  assert.equal(body2.orderNumber, body1.orderNumber);
  assert.equal(body2.idempotentReplay, true);
  // Stock must still be 4, NOT 3
  assert.equal(await stockOf('idemp-item'), 4);
  assert.equal(await (await col('orders')).countDocuments({ orderNumber: body1.orderNumber }), 1);
});

test('INV-4: expired coupon is rejected or discounted to 0', async () => {
  const { calculateCouponDiscount, ACTIVE_COUPONS } = await import('@/lib/coupons');
  ACTIVE_COUPONS.EXPIRED_TEST = {
    code: 'EXPIRED_TEST',
    type: 'FIXED',
    value: 500,
    expiresAt: new Date(Date.now() - 100000),
  };
  ACTIVE_COUPONS.ACTIVE_TEST = {
    code: 'ACTIVE_TEST',
    type: 'FIXED',
    value: 500,
    expiresAt: new Date(Date.now() + 100000),
  };

  try {
    const expiredResult = calculateCouponDiscount('EXPIRED_TEST', 2000);
    assert.equal(expiredResult.valid, false);
    assert.equal(expiredResult.discount, 0);
    assert.match(expiredResult.reason || '', /expired/i);

    const activeResult = calculateCouponDiscount('ACTIVE_TEST', 2000);
    assert.equal(activeResult.valid, true);
    assert.equal(activeResult.discount, 500);
  } finally {
    delete ACTIVE_COUPONS.EXPIRED_TEST;
    delete ACTIVE_COUPONS.ACTIVE_TEST;
  }
});


test('SEC-03: one account cannot hold unlimited unpaid online reservations', async () => {
  await seedProduct({ slug: 'hoard', price: 500, stock: 100 });
  const pending = Array.from({ length: 5 }, (_, i) => ({
    orderNumber: `HOLD-${i}`, firebaseUid: 'alice', orderStatus: 'PENDING', stockHeld: true,
    payment: { paymentMethod: 'RAZORPAY', paymentStatus: 'PENDING' },
  }));
  await (await col('orders')).insertMany(pending as any[]);
  const res = await order({ paymentMethod: 'razorpay', items: [{ productId: 'hoard', quantity: 1 }] });
  assert.equal(res.status, 429);
  assert.equal(await stockOf('hoard'), 100);
});

test('SEC-03: order creation is rate limited per client', async () => {
  await seedProduct({ slug: 'spam', price: 500, stock: 100 });
  let last = 0;
  for (let i = 0; i < 16; i++) last = (await order({ items: [] })).status;
  assert.equal(last, 429);
});

test('INV-4: simultaneous orders cannot both claim a once-per-customer coupon', async () => {
  await seedProduct({ slug: 'big-figure', price: 2500, stock: 50 });
  const results = await Promise.all([1, 2, 3].map(() =>
    order({ couponCode: 'WELCOME', items: [{ productId: 'big-figure', quantity: 1 }] })));
  const statuses = results.map((r) => r.status);
  assert.equal(statuses.filter((s) => s === 200).length, 1, `statuses ${statuses}`);
  assert.ok(statuses.every((s) => s === 200 || s === 400), `no 5xx: ${statuses}`);
  assert.equal(await stockOf('big-figure'), 49, 'losing orders must give their stock back');
  assert.equal(await (await col('orders')).countDocuments({ couponCode: 'WELCOME' }), 1);
});
