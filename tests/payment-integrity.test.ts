import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { POST as verifyPayment } from '@/app/api/verify-payment/route';
import { POST as webhook } from '@/app/api/webhooks/razorpay/route';
import {
  resetDb, dropDbAndClose, seedOrder, seedProduct, getOrder, col,
  checkoutSignature, webhookSignature, jsonRequest, capturedEvent,
} from './helpers/db';

const sendWebhook = (raw: string, sig = webhookSignature(raw)) =>
  webhook(jsonRequest('/api/webhooks/razorpay', raw, { 'x-razorpay-signature': sig }));

before(resetDb);
beforeEach(resetDb);
after(dropDbAndClose);

test('PAY-01: legacy /api/orders/verify-payment route no longer exists', () => {
  assert.equal(existsSync('app/api/orders/verify-payment/route.ts'), false);
});

test('PAY-01/INV-5,7: a valid signature for a cheap order cannot mark a different order paid', async () => {
  await seedOrder({ orderNumber: 'CHEAP', total: 1 });
  await seedOrder({ orderNumber: 'EXPENSIVE', total: 50000 });
  const sig = checkoutSignature('order_CHEAP', 'pay_1');

  const res = await verifyPayment(jsonRequest('/api/verify-payment', {
    order_id: 'order_CHEAP', payment_id: 'pay_1', razorpay_signature: sig, orderNumber: 'EXPENSIVE',
  }));
  assert.equal(res.status, 400);
  const victim = await getOrder('EXPENSIVE');
  assert.equal(victim.payment.paymentStatus, 'PENDING');
  assert.equal(victim.orderStatus, 'PENDING');
});

test('INV-5: forged checkout signature is rejected and the order stays unpaid', async () => {
  await seedOrder({ orderNumber: 'A1', total: 500 });
  const res = await verifyPayment(jsonRequest('/api/verify-payment', {
    order_id: 'order_A1', payment_id: 'pay_x', razorpay_signature: 'f'.repeat(64),
  }));
  assert.equal(res.status, 400);
  assert.equal((await getOrder('A1')).payment.paymentStatus, 'PENDING');
});

test('non-string payment fields are rejected (no operator injection)', async () => {
  const res = await verifyPayment(jsonRequest('/api/verify-payment', {
    order_id: { $ne: null }, payment_id: 'p', razorpay_signature: 's',
  }));
  assert.equal(res.status, 400);
});

test('INV-6: verify + webhook for the same payment decrement stock exactly once', async () => {
  const productId = await seedProduct({ slug: 'figure', price: 1000, stock: 5 });
  await seedOrder({ orderNumber: 'B1', total: 2000, items: [{ productId, name: 'figure', purchasePrice: 1000, quantity: 2, subtotal: 2000 }] });
  const sig = checkoutSignature('order_B1', 'pay_B1');
  const raw = capturedEvent({ paymentId: 'pay_B1', orderId: 'order_B1', amountPaise: 200000 });

  const results = await Promise.all([
    verifyPayment(jsonRequest('/api/verify-payment', { order_id: 'order_B1', payment_id: 'pay_B1', razorpay_signature: sig })),
    sendWebhook(raw),
    sendWebhook(raw),
    verifyPayment(jsonRequest('/api/verify-payment', { order_id: 'order_B1', payment_id: 'pay_B1', razorpay_signature: sig })),
  ]);
  for (const r of results) assert.equal(r.status, 200);

  const order = await getOrder('B1');
  assert.equal(order.payment.paymentStatus, 'PAID');
  assert.equal(order.orderStatus, 'CONFIRMED');
  const product = await (await col('products')).findOne({ slug: 'figure' });
  assert.equal(product.stock, 3);
});

test('PAY-02: webhook ignores payment notes and binds only by gateway order id', async () => {
  await seedOrder({ orderNumber: 'CHEAP2', total: 1 });
  await seedOrder({ orderNumber: 'VICTIM', total: 80000 });
  const raw = capturedEvent({ paymentId: 'pay_c2', orderId: 'order_CHEAP2', amountPaise: 100, notes: { orderNumber: 'VICTIM' } });
  const res = await sendWebhook(raw);
  assert.equal(res.status, 200);
  assert.equal((await getOrder('VICTIM')).payment.paymentStatus, 'PENDING');
  assert.equal((await getOrder('CHEAP2')).payment.paymentStatus, 'PAID');
});

test('PAY-02/INV-7: webhook with an underpaid amount does not mark the order paid and flags it', async () => {
  await seedOrder({ orderNumber: 'AMT', total: 500 });
  await sendWebhook(capturedEvent({ paymentId: 'pay_amt', orderId: 'order_AMT', amountPaise: 100 }));
  const order = await getOrder('AMT');
  assert.equal(order.payment.paymentStatus, 'PENDING');
  assert.deepEqual(order.reviewFlags, ['AMOUNT_MISMATCH']);
});

test('INV-5: webhook with a bad HMAC is rejected', async () => {
  await seedOrder({ orderNumber: 'H1', total: 500 });
  const raw = capturedEvent({ paymentId: 'pay_h', orderId: 'order_H1', amountPaise: 50000 });
  const res = await sendWebhook(raw, '0'.repeat(64));
  assert.equal(res.status, 400);
  assert.equal((await getOrder('H1')).payment.paymentStatus, 'PENDING');
});

test('authorized-but-not-captured payments are not treated as paid', async () => {
  await seedOrder({ orderNumber: 'AUTH', total: 500 });
  await sendWebhook(capturedEvent({ paymentId: 'pay_a', orderId: 'order_AUTH', amountPaise: 50000, status: 'authorized' }));
  assert.equal((await getOrder('AUTH')).payment.paymentStatus, 'PENDING');
});

test('PAY-05: a late payment cannot resurrect a cancelled order; it is flagged for refund', async () => {
  await seedOrder({ orderNumber: 'CANC', total: 500, orderStatus: 'CANCELLED' });
  await sendWebhook(capturedEvent({ paymentId: 'pay_late', orderId: 'order_CANC', amountPaise: 50000 }));
  const order = await getOrder('CANC');
  assert.equal(order.orderStatus, 'CANCELLED');
  assert.equal(order.payment.paymentStatus, 'PENDING');
  assert.deepEqual(order.reviewFlags, ['PAID_AFTER_CANCELLATION']);
});

test('PAY-05: COD orders cannot be flipped to PAID by a payment event', async () => {
  await seedOrder({ orderNumber: 'COD1', total: 500, method: 'COD', orderStatus: 'SHIPPED', razorpayOrderId: 'order_COD1' });
  await sendWebhook(capturedEvent({ paymentId: 'pay_cod', orderId: 'order_COD1', amountPaise: 50000 }));
  const order = await getOrder('COD1');
  assert.equal(order.orderStatus, 'SHIPPED');
  assert.equal(order.payment.paymentStatus, 'PENDING');
});

test('PAY-06/INV-10: payment.failed keeps the binding so a later successful retry still confirms', async () => {
  await seedOrder({ orderNumber: 'RETRY', total: 500 });
  await sendWebhook(capturedEvent({ event: 'payment.failed', paymentId: 'pay_fail', orderId: 'order_RETRY', amountPaise: 50000, status: 'failed' }));
  let order = await getOrder('RETRY');
  assert.equal(order.payment.paymentStatus, 'FAILED');
  assert.equal(order.orderStatus, 'PENDING');
  assert.equal(order.payment.razorpayOrderId, 'order_RETRY');

  const res = await verifyPayment(jsonRequest('/api/verify-payment', {
    order_id: 'order_RETRY', payment_id: 'pay_ok', razorpay_signature: checkoutSignature('order_RETRY', 'pay_ok'),
  }));
  assert.equal(res.status, 200);
  order = await getOrder('RETRY');
  assert.equal(order.payment.paymentStatus, 'PAID');
  assert.equal(order.payment.paymentId, 'pay_ok');
});

test('PAY-06: payment.failed cannot touch a paid or shipped order', async () => {
  await seedOrder({ orderNumber: 'SHIP', total: 500, orderStatus: 'SHIPPED', paymentStatus: 'PAID' });
  await sendWebhook(capturedEvent({ event: 'payment.failed', paymentId: 'pay_f', orderId: 'order_SHIP', amountPaise: 50000, status: 'failed' }));
  const order = await getOrder('SHIP');
  assert.equal(order.orderStatus, 'SHIPPED');
  assert.equal(order.payment.paymentStatus, 'PAID');
});

test('PAY-03: payment for an item that sold out meanwhile is flagged, stock never goes negative', async () => {
  const productId = await seedProduct({ slug: 'last-one', price: 700, stock: 1 });
  const item = { productId, name: 'last-one', purchasePrice: 700, quantity: 1, subtotal: 700 };
  await seedOrder({ orderNumber: 'R1', total: 700, items: [item] });
  await seedOrder({ orderNumber: 'R2', total: 700, items: [item] });
  await Promise.all(['R1', 'R2'].map((n) => sendWebhook(capturedEvent({ paymentId: `pay_${n}`, orderId: `order_${n}`, amountPaise: 70000 }))));

  const product = await (await col('products')).findOne({ slug: 'last-one' });
  assert.equal(product.stock, 0);
  const flagged = [await getOrder('R1'), await getOrder('R2')].filter((o) => o.reviewFlags?.includes('OUT_OF_STOCK_AFTER_PAYMENT'));
  assert.equal(flagged.length, 1, 'exactly one paid order must be flagged for owner follow-up');
});

test('unmatched captured payment returns 200 (no retry storm) and changes nothing', async () => {
  const res = await sendWebhook(capturedEvent({ paymentId: 'pay_ghost', orderId: 'order_GHOST', amountPaise: 100 }));
  assert.equal(res.status, 200);
  assert.equal(await (await col('orders')).countDocuments({}), 0);
});
