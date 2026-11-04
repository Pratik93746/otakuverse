import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { PATCH as adminOrderPatch, POST as adminOrderPost } from '@/app/api/admin/orders/[id]/route';
import { POST as createOrderRoute } from '@/app/api/orders/route';
import { POST as verifyPayment } from '@/app/api/verify-payment/route';
import { POST as webhook } from '@/app/api/webhooks/razorpay/route';
import { GET as cron } from '@/app/api/cron/release-reservations/route';
import { releaseExpiredReservations } from '@/lib/db/orders';
import { checkAdminTransition, ADMIN_TRANSITIONS, allowedAdminActions } from '@/lib/orders/lifecycle';
import { __setPaymentProviderForTests } from '@/lib/payments/provider';
import { makeFakeProvider } from './helpers/provider';
import {
  resetDb, dropDbAndClose, seedProduct, seedOrder, getOrder, col, jsonRequest,
  checkoutSignature, webhookSignature, capturedEvent,
} from './helpers/db';

const TOKENS: Record<string, any> = {
  'tok-admin': { uid: 'admin1', email: 'owner@shop.test', email_verified: true, admin: true },
  'tok-customer': { uid: 'uid_customer_a', email: 'a@shop.test', email_verified: true },
};
(adminAuth as any).verifyIdToken = async (t: string) => {
  if (!TOKENS[t]) throw new Error('invalid token');
  return TOKENS[t];
};
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (id: string, body: any, token = 'tok-admin') =>
  adminOrderPatch(jsonRequest(`/api/admin/orders/${id}`, body, bearer(token), 'PATCH'), ctx(id));
const post = (id: string, body: any, token = 'tok-admin') =>
  adminOrderPost(jsonRequest(`/api/admin/orders/${id}`, body, bearer(token)), ctx(id));
const stock = async (slug: string) => (await (await col('products')).findOne({ slug })).stock;
const item = (productId: string, quantity = 1, price = 1000) => ({ productId, name: 'x', purchasePrice: price, quantity, subtotal: price * quantity });

const fake = makeFakeProvider();
before(async () => { __setPaymentProviderForTests(fake.provider); await resetDb(); });
beforeEach(async () => { fake.reset(); await resetDb(); await (await col('auditLog')).deleteMany({}); });
after(async () => { await (await col('auditLog')).deleteMany({}); await dropDbAndClose(); });

// ---------- Pure state machine ----------

test('INV-12: legal admin transitions are exactly the documented table', async () => {
  const o = await seedOrder({ orderNumber: 'T1', total: 1000, method: 'COD', orderStatus: 'CONFIRMED' });
  assert.deepEqual(ADMIN_TRANSITIONS, {
    PENDING: ['CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [],
  });
  assert.deepEqual(allowedAdminActions(o), ['PROCESSING', 'CANCELLED']);
  for (const to of ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const) {
    assert.equal(checkAdminTransition(o, to).ok, false, to);
  }
});

// ---------- Admin API: authorization + fulfilment rules ----------

test('INV-13: customers and anonymous callers cannot change orders or refund', async () => {
  await seedOrder({ orderNumber: 'A', total: 500, method: 'COD', orderStatus: 'CONFIRMED' });
  for (const token of ['tok-customer', 'nope']) {
    assert.equal((await patch('A', { status: 'PROCESSING' }, token)).status, 403);
    assert.equal((await post('A', { action: 'refund' }, token)).status, 403);
  }
  assert.equal((await getOrder('A')).orderStatus, 'CONFIRMED');
});

test('INV-8: an unpaid online order cannot be packed or shipped (even via PATCH)', async () => {
  await seedOrder({ orderNumber: 'UNPAID', total: 500, orderStatus: 'PENDING' });
  for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
    const res = await patch('UNPAID', { status });
    assert.equal(res.status, 409, status);
  }
  assert.equal((await getOrder('UNPAID')).orderStatus, 'PENDING');
});

test('INV-8: even a CONFIRMED-looking online order without a PAID payment cannot be shipped', async () => {
  // Defence in depth: corrupted/legacy data where the status says CONFIRMED but money was never received.
  await seedOrder({ orderNumber: 'ODD', total: 500, orderStatus: 'CONFIRMED', paymentStatus: 'PENDING' });
  const res = await patch('ODD', { status: 'PROCESSING' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'PAYMENT_NOT_RECEIVED');
});

test('INV-12: happy path COD order → processing → shipped (with tracking) → delivered', async () => {
  await seedOrder({ orderNumber: 'COD1', total: 500, method: 'COD', orderStatus: 'CONFIRMED' });
  assert.equal((await patch('COD1', { status: 'PROCESSING' })).status, 200);
  const shipped = await patch('COD1', { status: 'SHIPPED', tracking: { carrier: 'Delhivery', trackingNumber: 'AWB123456' } });
  assert.equal(shipped.status, 200);
  const o = await getOrder('COD1');
  assert.equal(o.tracking.trackingNumber, 'AWB123456');
  assert.match(o.tracking.trackingUrl, /^https:\/\/www\.delhivery\.com\//);
  assert.equal((await patch('COD1', { status: 'DELIVERED' })).status, 200);
  assert.deepEqual(o.statusHistory.map((e: any) => e.to), ['PROCESSING', 'SHIPPED']);
  assert.equal((await patch('COD1', { status: 'CANCELLED' })).status, 409, 'delivered is final');
});

test('INV-12: skipping steps and going backwards are rejected', async () => {
  await seedOrder({ orderNumber: 'S1', total: 500, method: 'COD', orderStatus: 'CONFIRMED' });
  assert.equal((await patch('S1', { status: 'SHIPPED' })).status, 409);
  await patch('S1', { status: 'PROCESSING' });
  assert.equal((await patch('S1', { status: 'CONFIRMED' })).status, 409);
  assert.equal((await patch('S1', { status: 'PROCESSING' })).status, 409, 'same status');
});

test('two admins racing the same change: exactly one wins, the other is told to refresh', async () => {
  await seedOrder({ orderNumber: 'R1', total: 500, method: 'COD', orderStatus: 'CONFIRMED' });
  const results = await Promise.all([1, 2, 3].map(() => patch('R1', { status: 'PROCESSING' })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal((await getOrder('R1')).statusHistory.length, 1);
});

test('tracking input is validated: javascript: links and junk AWBs are rejected', async () => {
  await seedOrder({ orderNumber: 'TR', total: 500, method: 'COD', orderStatus: 'PROCESSING' });
  for (const tracking of [
    { carrier: 'Delhivery', trackingNumber: 'AWB123456', trackingUrl: 'javascript:alert(1)' },
    { carrier: 'Delhivery', trackingNumber: '<script>' },
    { carrier: '', trackingNumber: 'AWB123456' },
    'junk',
  ]) {
    assert.equal((await patch('TR', { status: 'SHIPPED', tracking })).status, 400, JSON.stringify(tracking));
  }
  assert.equal((await getOrder('TR')).orderStatus, 'PROCESSING');
});

test('INV-14: every status change is audited with the admin as actor', async () => {
  await seedOrder({ orderNumber: 'AU', total: 500, method: 'COD', orderStatus: 'CONFIRMED' });
  await patch('AU', { status: 'PROCESSING' });
  const log = await (await col('auditLog')).find({}).toArray();
  assert.equal(log.length, 1);
  assert.deepEqual([log[0].actor, log[0].action, log[0].target], ['owner@shop.test', 'order.status', 'AU']);
  assert.deepEqual(log[0].detail, { from: 'CONFIRMED', to: 'PROCESSING' });
});

// ---------- Cancellation, stock restoration ----------

test('cancelling a COD order returns its stock exactly once', async () => {
  const pid = await seedProduct({ slug: 'fig', price: 1000, stock: 5 });
  await seedOrder({ orderNumber: 'C1', total: 2000, method: 'COD', orderStatus: 'CONFIRMED', items: [item(pid, 2)] });
  await (await col('orders')).updateOne({ orderNumber: 'C1' }, { $set: { stockHeld: true } });
  await (await col('products')).updateOne({ slug: 'fig' }, { $inc: { stock: -2 } }); // 3 left after the sale
  assert.equal((await patch('C1', { status: 'CANCELLED' })).status, 200);
  assert.equal(await stock('fig'), 5);
  assert.equal((await patch('C1', { status: 'CANCELLED' })).status, 409);
  assert.equal(await stock('fig'), 5, 'second cancel does not add stock again');
});

test('concurrent cancels restore stock only once', async () => {
  const pid = await seedProduct({ slug: 'fig', price: 1000, stock: 0 });
  await seedOrder({ orderNumber: 'C2', total: 1000, method: 'COD', orderStatus: 'CONFIRMED', items: [item(pid, 1)] });
  await (await col('orders')).updateOne({ orderNumber: 'C2' }, { $set: { stockHeld: true } });
  await Promise.all([1, 2, 3].map(() => patch('C2', { status: 'CANCELLED' })));
  assert.equal(await stock('fig'), 1);
});

// ---------- Refunds (provider stubbed: real Razorpay refunds are BLOCKED without credentials) ----------

const paidOnline = async (n: string, total = 1000, pid?: string) => {
  await seedOrder({ orderNumber: n, total, orderStatus: 'CONFIRMED', paymentStatus: 'PAID', items: pid ? [item(pid, 1, total)] : [] });
  await (await col('orders')).updateOne({ orderNumber: n }, { $set: { 'payment.paymentId': `pay_${n}`, stockHeld: true } });
};

test('a paid online order cannot be cancelled without refunding the customer', async () => {
  await paidOnline('P1');
  const res = await patch('P1', { status: 'CANCELLED' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, 'REFUND_REQUIRED');
  assert.equal((await getOrder('P1')).orderStatus, 'CONFIRMED');
  assert.equal(fake.calls.createRefund, 0);
});

test('cancel + refund: refunds the exact paid amount once, cancels, restocks, audits', async () => {
  const pid = await seedProduct({ slug: 'fig', price: 1499.5, stock: 0 });
  await paidOnline('P2', 1499.5, pid);
  const res = await patch('P2', { status: 'CANCELLED', refund: true });
  assert.equal(res.status, 200);
  const o = await getOrder('P2');
  assert.equal(o.orderStatus, 'CANCELLED');
  assert.equal(o.payment.paymentStatus, 'REFUNDED');
  assert.equal(o.payment.refund.status, 'PROCESSED');
  assert.equal(fake.calls.createRefund, 1);
  assert.equal([...fake.refunds.get('pay_P2')!][0].amount, 149950);
  assert.equal(await stock('fig'), 1);
  const actions = (await (await col('auditLog')).find({}).toArray()).map((a: any) => a.action).sort();
  assert.deepEqual(actions, ['order.refund_attempt', 'order.status']);
});

test('INV-9/14: concurrent refund clicks create exactly one refund at the provider', async () => {
  await paidOnline('P3');
  fake.state.refundDelayMs = 50;
  const results = await Promise.all([1, 2, 3, 4].map(() => patch('P3', { status: 'CANCELLED', refund: true })));
  assert.equal(fake.calls.createRefund, 1);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal((await getOrder('P3')).payment.paymentStatus, 'REFUNDED');
});

test('refund retry after an ambiguous failure adopts the refund that already exists (no double refund)', async () => {
  await paidOnline('P4', 1000);
  fake.refunds.set('pay_P4', [{ id: 'rfnd_existing', amount: 100000, status: 'processed' }]);
  const res = await patch('P4', { status: 'CANCELLED', refund: true });
  assert.equal(res.status, 200);
  assert.equal(fake.calls.createRefund, 0);
  assert.equal((await getOrder('P4')).payment.refund.razorpayRefundId, 'rfnd_existing');
});

test('a failed refund leaves the order untouched, flagged, and retryable', async () => {
  await paidOnline('P5');
  fake.state.refundError = new Error('gateway exploded');
  const res = await patch('P5', { status: 'CANCELLED', refund: true });
  assert.equal(res.status, 502);
  let o = await getOrder('P5');
  assert.equal(o.orderStatus, 'CONFIRMED');
  assert.equal(o.payment.paymentStatus, 'PAID');
  assert.ok(o.reviewFlags.includes('REFUND_REQUIRED'));
  assert.equal(o.payment.refund.status, 'FAILED');
  fake.state.refundError = null;
  assert.equal((await patch('P5', { status: 'CANCELLED', refund: true })).status, 200);
  o = await getOrder('P5');
  assert.equal(o.payment.paymentStatus, 'REFUNDED');
  assert.ok(!o.reviewFlags?.includes('REFUND_REQUIRED'));
});

test('COD and unpaid orders have nothing to refund', async () => {
  await seedOrder({ orderNumber: 'NR', total: 500, method: 'COD', orderStatus: 'CANCELLED' });
  assert.equal((await post('NR', { action: 'refund' })).status, 502);
  assert.equal(fake.calls.createRefund, 0);
});

test('late payment on an expired/cancelled order: flagged, then refundable from the cancelled order', async () => {
  await seedOrder({ orderNumber: 'LATE', total: 700, orderStatus: 'CANCELLED' });
  const raw = capturedEvent({ paymentId: 'pay_LATE', orderId: 'order_LATE', amountPaise: 70000 });
  await webhook(jsonRequest('/api/webhooks/razorpay', raw, { 'x-razorpay-signature': webhookSignature(raw) }));
  assert.ok((await getOrder('LATE')).reviewFlags.includes('PAID_AFTER_CANCELLATION'));
});

// ---------- Reservations (inventory model) ----------

const address = { name: 'A', line1: '12 MG Road', city: 'Pune', pincode: '411001', phone: '9876543210' };
const checkout = (body: any) =>
  createOrderRoute(jsonRequest('/api/orders', { address, customerPhone: '9876543210', ...body }, bearer('tok-customer')));

test('INV-10: online checkout reserves stock immediately; payment does not deduct a second time', async () => {
  await seedProduct({ slug: 'one', price: 1000, stock: 3 });
  const res = await checkout({ items: [{ productId: 'one', quantity: 2 }], paymentMethod: 'razorpay' });
  // Razorpay is not configured in tests → gateway step fails → reservation is returned.
  assert.equal(res.status, 502);
  assert.equal(await stock('one'), 3, 'failed gateway call releases the reservation');
  assert.equal((await (await col('orders')).find({}).toArray())[0].orderStatus, 'CANCELLED');
});

test('INV-10: paying a reserved order leaves stock unchanged (no double deduction)', async () => {
  const pid = await seedProduct({ slug: 'one', price: 1000, stock: 1 }); // 1 left: 2 already reserved elsewhere
  await seedOrder({ orderNumber: 'RES', total: 2000, items: [item(pid, 2)] });
  await (await col('orders')).updateOne({ orderNumber: 'RES' }, { $set: { stockHeld: true, reservationExpiresAt: new Date(Date.now() + 600_000) } });
  fake.addPayment({ id: 'pay_RES', order_id: 'order_RES', amount: 200000 });
  const res = await verifyPayment(jsonRequest('/api/verify-payment', { order_id: 'order_RES', payment_id: 'pay_RES', razorpay_signature: checkoutSignature('order_RES', 'pay_RES') }));
  assert.equal(res.status, 200);
  assert.equal(await stock('one'), 1);
  assert.equal((await getOrder('RES')).payment.paymentStatus, 'PAID');
});

test('expired unpaid reservations are cancelled and their stock returned exactly once', async () => {
  const pid = await seedProduct({ slug: 'one', price: 1000, stock: 0 });
  await seedOrder({ orderNumber: 'EXP', total: 1000, items: [item(pid, 1)] });
  await (await col('orders')).updateOne({ orderNumber: 'EXP' }, { $set: { stockHeld: true, reservationExpiresAt: new Date(Date.now() - 1000) } });
  await seedOrder({ orderNumber: 'LIVE', total: 1000, items: [item(pid, 1)] });
  await (await col('orders')).updateOne({ orderNumber: 'LIVE' }, { $set: { stockHeld: true, reservationExpiresAt: new Date(Date.now() + 600_000) } });
  const counts = await Promise.all([releaseExpiredReservations(), releaseExpiredReservations()]);
  assert.equal(counts[0] + counts[1], 1);
  assert.equal(await stock('one'), 1);
  assert.equal((await getOrder('EXP')).orderStatus, 'CANCELLED');
  assert.equal((await getOrder('LIVE')).orderStatus, 'PENDING');
});

test('the cron endpoint requires the secret and releases expired reservations', async () => {
  const pid = await seedProduct({ slug: 'one', price: 1000, stock: 0 });
  await seedOrder({ orderNumber: 'EXP2', total: 1000, items: [item(pid, 1)] });
  await (await col('orders')).updateOne({ orderNumber: 'EXP2' }, { $set: { stockHeld: true, reservationExpiresAt: new Date(Date.now() - 1000) } });
  const req = (auth?: string) => new NextRequest('http://localhost/api/cron/release-reservations', { headers: auth ? { authorization: auth } : {} });
  delete process.env.CRON_SECRET;
  assert.equal((await cron(req('Bearer undefined'))).status, 401, 'no secret configured → closed');
  process.env.CRON_SECRET = 'a-long-random-cron-secret-123';
  assert.equal((await cron(req())).status, 401);
  assert.equal((await cron(req('Bearer wrong-wrong-wrong-wrong-wrong'))).status, 401);
  const ok = await cron(req('Bearer a-long-random-cron-secret-123'));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).released, 1);
  assert.equal(await stock('one'), 1);
});

// ---------- Provider-side confirmation (browser callback) ----------

const verify = (orderId: string, paymentId: string) =>
  verifyPayment(jsonRequest('/api/verify-payment', { order_id: orderId, payment_id: paymentId, razorpay_signature: checkoutSignature(orderId, paymentId) }));

test('I1/I8: a valid signature is not enough — a payment Razorpay says is not captured does not confirm the order', async () => {
  await seedOrder({ orderNumber: 'NC', total: 500 });
  fake.addPayment({ id: 'pay_NC', order_id: 'order_NC', amount: 50000, status: 'failed' });
  const res = await verify('order_NC', 'pay_NC');
  assert.equal(res.status, 503);
  assert.equal((await getOrder('NC')).payment.paymentStatus, 'PENDING');
});

test('an authorized-but-uncaptured payment is captured server-side for the exact order amount, then confirmed', async () => {
  await seedOrder({ orderNumber: 'AU1', total: 500 });
  fake.addPayment({ id: 'pay_AU1', order_id: 'order_AU1', amount: 50000, status: 'authorized' });
  assert.equal((await verify('order_AU1', 'pay_AU1')).status, 200);
  assert.equal(fake.calls.capture, 1);
});

test('I2: Razorpay says the payment belongs to a different gateway order → rejected', async () => {
  await seedOrder({ orderNumber: 'X1', total: 500 });
  fake.addPayment({ id: 'pay_X1', order_id: 'order_OTHER', amount: 50000 });
  assert.equal((await verify('order_X1', 'pay_X1')).status, 400);
  assert.equal((await getOrder('X1')).payment.paymentStatus, 'PENDING');
});

test('amount reported by Razorpay must equal the order total', async () => {
  await seedOrder({ orderNumber: 'X2', total: 500 });
  fake.addPayment({ id: 'pay_X2', order_id: 'order_X2', amount: 100 });
  const res = await verify('order_X2', 'pay_X2');
  assert.notEqual(res.status, 200);
  assert.equal((await getOrder('X2')).payment.paymentStatus, 'PENDING');
});

test('I3/INV-18: if Razorpay cannot be reached, the callback fails closed (503) and the webhook can still complete the order', async () => {
  await seedOrder({ orderNumber: 'DOWN', total: 500 });
  fake.addPayment({ id: 'pay_DOWN', order_id: 'order_DOWN', amount: 50000 });
  fake.state.down = true;
  const res = await verify('order_DOWN', 'pay_DOWN');
  assert.equal(res.status, 503);
  assert.equal((await res.json()).pending, true);
  assert.equal((await getOrder('DOWN')).payment.paymentStatus, 'PENDING');
  const raw = capturedEvent({ paymentId: 'pay_DOWN', orderId: 'order_DOWN', amountPaise: 50000 });
  assert.equal((await webhook(jsonRequest('/api/webhooks/razorpay', raw, { 'x-razorpay-signature': webhookSignature(raw) }))).status, 200);
  assert.equal((await getOrder('DOWN')).payment.paymentStatus, 'PAID');
});

test('I3: with no payment provider configured the callback cannot confirm anything', async () => {
  __setPaymentProviderForTests(null);
  try {
    await seedOrder({ orderNumber: 'NOPROV', total: 500 });
    assert.equal((await verify('order_NOPROV', 'pay_1')).status, 503);
    assert.equal((await getOrder('NOPROV')).payment.paymentStatus, 'PENDING');
  } finally {
    __setPaymentProviderForTests(fake.provider);
  }
});
