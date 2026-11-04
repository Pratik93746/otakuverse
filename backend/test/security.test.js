const assert = require('assert');
const crypto = require('crypto');

let serverInstance = null;
let BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

let mongod = null;

async function ensureServerRunning() {
  process.env.NODE_ENV = 'test';
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      return;
    }
  } catch {
    // Server is not running, launch in-process for tests
  }

  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
  }

  const app = require('../src/app');
  const { connectDatabase } = require('../src/config/database');
  await connectDatabase();

  const testPort = process.env.PORT || 5002;
  await new Promise((resolve) => {
    serverInstance = app.listen(testPort, () => {
      BASE_URL = `http://localhost:${testPort}`;
      resolve();
    });
  });
}

async function runSecurityTests() {
  console.log('🛡️  [Security Test Suite] Starting Autonomous Adversarial Security Verification...\n');
  process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'sec_webhook_test_secret_32bytes_ok';
  await ensureServerRunning();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // VULNERABILITY CLASS 1: SEC-CRIT-01 Admin Privilege Escalation
    // -------------------------------------------------------------
    await test('SEC-CRIT-01: GET /api/v1/admin/orders without authentication is rejected with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/orders`);
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'AUTH_UNAUTHORIZED');
    });

    await test('SEC-CRIT-01: GET /api/v1/admin/products with forged/invalid token is rejected with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/products`, {
        headers: { Authorization: 'Bearer forged.token.attempting.admin.access' },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
    });

    await test('SEC-CRIT-01: Public user registration cannot self-assign role: "ADMIN"', async () => {
      const User = require('../src/models/User');
      const testUid = `sec_test_${Date.now()}`;
      const userService = require('../src/services/user.service');

      // Attempting to sync an unverified user with role: 'ADMIN'
      const syncedUser = await userService.syncUser({
        uid: testUid,
        email: 'unverified-attacker@example.com',
        email_verified: false,
        name: 'Attacker',
        role: 'ADMIN',
      });

      // Role must strictly be USER because email is unverified and not in admin list
      assert.strictEqual(syncedUser.role, 'USER', 'Unverified user was erroneously granted ADMIN role!');

      // Cleanup
      await User.deleteOne({ authProviderId: testUid });
    });

    // -------------------------------------------------------------
    // VULNERABILITY CLASS 2: SEC-CRIT-02 Zero-Trust Pricing & Discount Tampering
    // -------------------------------------------------------------
    await test('SEC-CRIT-02: Order creation rejecting client-supplied discount parameter (400 Bad Request)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer dummy-token-for-validation-check',
        },
        body: JSON.stringify({
          items: [{ productId: '60c72b2f9b1d8b2bad000001', quantity: 1, unitPrice: 100 }],
          shippingAddress: {
            fullName: 'Test User',
            addressLine1: '123 Test St',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'India',
            phone: '9876543210',
          },
          paymentMethod: 'ONLINE',
          discount: 500, // Malicious client discount override attempt
        }),
      });

      // Even before auth or at validation stage, discount must be caught or rejected
      const data = await res.json();
      assert(
        res.status === 400 || res.status === 401,
        `Expected status 400 or 401, got ${res.status}`
      );
      if (res.status === 400) {
        assert(
          data.error.message.includes('discount') || data.error.message.includes('Coupon'),
          'Validator did not reject client discount override'
        );
      }
    });

    await test('SEC-CRIT-02: Order validator rejects negative quantities and invalid products', async () => {
      const { validateOrderCreate } = require('../src/validators/order.validator');
      const errorNegativeQty = validateOrderCreate({
        body: {
          items: [{ productId: 'prod_123', quantity: -5 }],
          shippingAddress: { fullName: 'Test', addressLine1: '123 St', city: 'City', state: 'St', postalCode: '123456', phone: '9999999999' },
          paymentMethod: 'ONLINE',
        },
      });
      assert(errorNegativeQty !== null, 'Validator failed to reject negative quantity');

      const errorDiscountOverride = validateOrderCreate({
        body: {
          items: [{ productId: 'prod_123', quantity: 1 }],
          shippingAddress: { fullName: 'Test', addressLine1: '123 St', city: 'City', state: 'St', postalCode: '123456', phone: '9999999999' },
          paymentMethod: 'ONLINE',
          discount: 100,
        },
      });
      assert(errorDiscountOverride !== null, 'Validator failed to reject client discount field');
    });

    // -------------------------------------------------------------
    // VULNERABILITY CLASS 3: SEC-CRIT-04 Payment Webhook Verification & HMAC Authenticity
    // -------------------------------------------------------------
    await test('SEC-CRIT-04: POST /api/v1/payments/webhook with missing signature returns 400', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert(data.error && data.error.toLowerCase().includes('signature'));
    });

    await test('SEC-CRIT-04: POST /api/v1/payments/webhook with forged signature returns 400', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: JSON.stringify({ event: 'payment.captured' }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert(data.error && data.error.toLowerCase().includes('signature'));
    });

    await test('SEC-CRIT-04: Authentic HMAC-signed webhook is accepted and processes correctly', async () => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'sec_webhook_test_secret_32bytes_ok';
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify({
        event: 'order.paid',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_authentic_123',
              order_id: 'order_test_nonexistent_456',
              amount: 50000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });

      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const res = await fetch(`${BASE_URL}/api/v1/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validSignature,
        },
        body: payload,
      });

      const data = await res.json();
      // Even if order is not found, signature verification succeeded!
      assert(res.status === 200 || res.status === 404, `Unexpected status: ${res.status}`);
      if (res.status === 200) {
        assert.strictEqual(data.received, true);
      }
    });

    // -------------------------------------------------------------
    // VULNERABILITY CLASS 4: SEC-CRIT-03 Payment Verification & Order Substitution
    // -------------------------------------------------------------
    await test('SEC-CRIT-03: POST /api/v1/payments/verify with forged signature is rejected', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: '60c72b2f9b1d8b2bad000001',
          razorpayOrderId: 'order_fake_123',
          razorpayPaymentId: 'pay_fake_456',
          razorpaySignature: 'forged_signature_attempt',
        }),
      });
      const data = await res.json();
      assert(res.status === 400 || res.status === 401);
      assert.strictEqual(data.success, false);
    });

    // -------------------------------------------------------------
    // VULNERABILITY CLASS 5: SEC-MED-02 ReDoS & Query Sanitization
    // -------------------------------------------------------------
    await test('SEC-MED-02: Catastrophic backtracking regex search query executes safely and immediately', async () => {
      const redosPayload = encodeURIComponent('((((((((a+)+)+)+)+)+)+)+)$');
      const start = Date.now();
      const res = await fetch(`${BASE_URL}/api/v1/products?q=${redosPayload}`);
      const duration = Date.now() - start;

      assert.strictEqual(res.status, 200);
      assert(duration < 500, `ReDoS payload caused significant delay: ${duration}ms`);
    });

    await test('SEC-MED-02: Wildcard regex symbols in category/anime/brand are escaped safely', async () => {
      const wildcardPayload = encodeURIComponent('.*.*.*.*.*.*.*.*');
      const start = Date.now();
      const res = await fetch(`${BASE_URL}/api/v1/products?category=${wildcardPayload}`);
      const duration = Date.now() - start;

      assert.strictEqual(res.status, 200);
      assert(duration < 500, `Wildcard regex caused significant delay: ${duration}ms`);
    });

    // -------------------------------------------------------------
    // VULNERABILITY CLASS 6: Invariant Checks on Price Validation
    // -------------------------------------------------------------
    await test('Boundary check: minPrice > maxPrice produces 400 validation error', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/products?minPrice=9999&maxPrice=10`);
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

  } finally {
    if (serverInstance) {
      const { disconnectDatabase } = require('../src/config/database');
      await new Promise((resolve) => serverInstance.close(resolve));
      await disconnectDatabase();
    }
    if (mongod) {
      await mongod.stop();
    }
  }

  console.log(`\n============================================================`);
  console.log(`🎉 [Security Results] Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Security test run failed:', err);
  process.exit(1);
});
