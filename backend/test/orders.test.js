// Service-level tests for the hardened order flow (atomic stock + coupons, restock, state rules, sanitising).
const assert = require('assert');

async function main() {
  process.env.NODE_ENV = 'test';
  let mongod = null;
  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
  }
  const { connectDatabase, disconnectDatabase } = require('../src/config/database');
  await connectDatabase();

  const mongoose = require('mongoose');
  const Product = require('../src/models/Product');
  const Order = require('../src/models/Order');
  const orderService = require('../src/services/order.service');
  const productService = require('../src/services/product.service');
  const sanitizeRequest = require('../src/middleware/sanitize');
  await Order.init();

  const address = { fullName: 'Asha', phone: '9876543210', addressLine1: '12 MG Road', city: 'Pune', state: 'MH', pinCode: '411001' };
  let n = 0;
  const seed = async (stock, price = 3000) => {
    const _id = new mongoose.Types.ObjectId().toString();
    await Product.create({ _id, name: `Fig ${++n}`, slug: `fig-${n}-${_id.slice(-4)}`, price, stock, isActive: true });
    return _id;
  };
  const stockOf = async (id) => (await Product.findById(id).lean()).stock;
  const place = (uid, id, extra = {}) =>
    orderService.createOrder(uid, {}, [{ productId: id, quantity: extra.qty || 1 }], address, extra.coupon || null, 'INR', extra.method || 'COD');

  let passed = 0;
  let failed = 0;
  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  };

  await test('concurrent orders for the last unit: exactly one wins, stock never negative', async () => {
    const id = await seed(1);
    const r = await Promise.allSettled([1, 2, 3, 4].map((i) => place(`u${i}`, id)));
    assert.strictEqual(r.filter((x) => x.status === 'fulfilled').length, 1);
    assert.strictEqual(await stockOf(id), 0);
    for (const x of r.filter((y) => y.status === 'rejected')) {
      assert.ok([409, 400].includes(x.reason.statusCode), `status ${x.reason.statusCode}`);
    }
  });

  await test('once-per-customer coupon cannot be claimed twice by simultaneous requests', async () => {
    const id = await seed(10);
    const r = await Promise.allSettled([1, 2, 3].map(() => place('coupon-user', id, { coupon: 'WELCOME' })));
    assert.strictEqual(r.filter((x) => x.status === 'fulfilled').length, 1, JSON.stringify(r.map((x) => x.status)));
    assert.strictEqual(await stockOf(id), 9, 'losing orders must return their stock');
  });

  await test('cancelling returns stock exactly once and frees the coupon', async () => {
    const id = await seed(5);
    const o = await place('cancel-user', id, { coupon: 'FIRSTWALL' });
    assert.strictEqual(await stockOf(id), 4);
    await orderService.updateOrderStatus(o._id.toString(), 'CANCELLED');
    assert.strictEqual(await stockOf(id), 5);
    await orderService.restockOrderOnce(await Order.findById(o._id).lean());
    assert.strictEqual(await stockOf(id), 5, 'a second restock must be a no-op');
    await place('cancel-user', id, { coupon: 'FIRSTWALL' }); // coupon usable again
  });

  await test('unpaid online order cannot be shipped; legal transitions only', async () => {
    const id = await seed(5);
    const o = await place('ship-user', id, { method: 'RAZORPAY' });
    await assert.rejects(orderService.updateOrderStatus(o._id.toString(), 'SHIPPED'), (e) => e.statusCode === 409);
    const cod = await place('ship-user', id);
    await orderService.updateOrderStatus(cod._id.toString(), 'PROCESSING');
    await orderService.updateOrderStatus(cod._id.toString(), 'SHIPPED');
    await orderService.updateOrderStatus(cod._id.toString(), 'DELIVERED');
    assert.strictEqual((await Order.findById(cod._id).lean()).paymentStatus, 'PAID');
    await assert.rejects(orderService.updateOrderStatus(cod._id.toString(), 'CANCELLED'), (e) => e.statusCode === 409);
  });

  await test('expired unpaid reservations are cancelled and their stock returned', async () => {
    const id = await seed(5);
    const o = await place('expire-user', id, { method: 'RAZORPAY' });
    assert.strictEqual(await stockOf(id), 4);
    await Order.updateOne({ _id: o._id }, { $set: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    assert.ok((await orderService.releaseExpiredReservations()) >= 1);
    assert.strictEqual(await stockOf(id), 5);
    assert.strictEqual((await Order.findById(o._id).lean()).orderStatus, 'CANCELLED');
  });

  await test('one account cannot hold more than 5 unpaid online reservations', async () => {
    const id = await seed(50);
    for (let i = 0; i < 5; i++) await place('hoarder', id, { method: 'RAZORPAY' });
    await assert.rejects(place('hoarder', id, { method: 'RAZORPAY' }), (e) => e.statusCode === 429);
  });

  await test('bad quantities and operator objects are rejected with 4xx, not 500', async () => {
    const id = await seed(5);
    for (const q of [0, -1, 1.5, '2', 999]) {
      await assert.rejects(
        orderService.createOrder('q', {}, [{ productId: id, quantity: q }], address, null, 'INR', 'COD'),
        (e) => e.statusCode === 400
      );
    }
    await assert.rejects(
      orderService.createOrder('q', {}, [{ productId: { $ne: null }, quantity: 1 }], address, null, 'INR', 'COD'),
      (e) => e.statusCode === 400
    );
  });

  await test('customer only sees their own order (others get not-found)', async () => {
    const id = await seed(5);
    const o = await place('owner', id);
    assert.ok(await orderService.getOrderById(o.orderNumber, 'owner', false));
    assert.strictEqual(await orderService.getOrderById(o.orderNumber, 'stranger', false), null);
  });

  await test('sanitizer strips $operators and dotted keys from body/query/params', async () => {
    const req = { body: { a: { $ne: null }, b: [{ $gt: 1, ok: 1 }], 'x.y': 1 }, query: { 'c.d': 1, e: { $regex: '.*' } }, params: {} };
    sanitizeRequest(req, {}, () => {});
    assert.deepStrictEqual(req.body, { a: {}, b: [{ ok: 1 }] });
    assert.deepStrictEqual(req.query, { e: {} });
  });

  await test('admin product update ignores unknown/dangerous fields (no mass assignment)', async () => {
    const id = await seed(5);
    const bad = await productService.updateProduct(id, { price: 111, stock: -4 }).catch((e) => e);
    assert.strictEqual(bad.statusCode, 400, 'negative stock rejected');
    const ok = await productService.updateProduct(id, { price: 111, _id: 'hijack', rating: 5, isAdmin: true });
    assert.strictEqual(ok._id, id);
    assert.strictEqual(ok.price, 111);
    assert.strictEqual(ok.isAdmin, undefined);
  });

  console.log(`\n🎉 [Order Hardening Results] Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  await disconnectDatabase().catch(() => {});
  if (mongod) await mongod.stop();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
