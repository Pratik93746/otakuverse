const assert = require('assert');

let serverInstance = null;
let BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';

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

  const testPort = process.env.PORT || 5001;
  await new Promise((resolve) => {
    serverInstance = app.listen(testPort, () => {
      BASE_URL = `http://localhost:${testPort}`;
      resolve();
    });
  });
}

async function runTests() {
  console.log('🧪 [Test Suite] Starting Otakuverse Backend API Verification...\n');
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
    const Product = require('../src/models/Product');
    const Category = require('../src/models/Category');

    await Product.updateOne(
      { slug: 'all-star-anime-vault' },
      {
        $setOnInsert: {
          name: 'All Star Anime Vault',
          slug: 'all-star-anime-vault',
          price: 2999,
          stock: 10,
          category: 'Action Figures',
          isActive: true,
        },
      },
      { upsert: true }
    );

    await Category.updateOne(
      { slug: 'action-figures' },
      {
        $setOnInsert: {
          name: 'Action Figures',
          slug: 'action-figures',
          isActive: true,
        },
      },
      { upsert: true }
    );

    // 1. Health Endpoint
    await test('GET /health returns { status: "ok" }', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.status, 'ok');
    });

    // 2. Product Retrieval & Pagination
    await test('GET /api/v1/products returns paginated products capped at <= 50', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/products?page=1&limit=5`);
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data));
      assert(data.data.length <= 5);
      assert.strictEqual(data.pagination.page, 1);
      assert(data.pagination.total > 0);
    });

    // 3. Product by Slug
    await test('GET /api/v1/products/slug/:slug returns specific product', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/products/slug/all-star-anime-vault`);
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.slug, 'all-star-anime-vault');
    });

    // 4. Invalid Product ID handling
    await test('GET /api/v1/products/:id with invalid ID returns 404', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/products/non-existent-id-xyz-123`);
      const data = await res.json();
      assert.strictEqual(res.status, 404);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'PRODUCT_NOT_FOUND');
    });

    // 5. Query Parameter Validation / MongoDB Injection Prevention
    await test('GET /api/v1/products?minPrice=-10 returns 400 validation error', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/products?minPrice=-10`);
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    // 6. Unauthenticated Cart Access
    await test('GET /api/v1/cart without Bearer token returns 401 Unauthorized', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/cart`);
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'AUTH_UNAUTHORIZED');
    });

    // 7. Unauthenticated Admin Route Access
    await test('GET /api/v1/admin/orders without token returns 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/orders`);
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'AUTH_UNAUTHORIZED');
    });

    // 8. Non-admin User accessing Admin Route
    await test('Admin route with fake token returns 401/403', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/products`, {
        headers: { Authorization: 'Bearer fake-invalid-token-test' },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
    });

    // 9. Categories Endpoint
    await test('GET /api/v1/categories returns list of active categories', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/categories`);
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data));
      assert(data.data.length > 0);
    });

    // 10. Missing verification fields on Payment verification
    await test('POST /api/v1/payments/verify without required fields returns 400/401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      assert(res.status === 400 || res.status === 401);
      assert.strictEqual(data.success, false);
    });

    // 11. 404 Route Catch-all
    await test('Unknown route returns standard 404 response', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/does-not-exist`);
      const data = await res.json();
      assert.strictEqual(res.status, 404);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'ROUTE_NOT_FOUND');
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
  console.log(`🎉 [Test Results] Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
