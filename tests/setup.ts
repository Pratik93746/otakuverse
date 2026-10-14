// Preloaded before every test file (see `npm test`). Points all code at an isolated,
// throwaway database and synthetic secrets. Never set real credentials here.
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/';
process.env.MONGODB_DB_NAME = `otakuverse_test_${process.pid}`;
process.env.RAZORPAY_KEY_ID = 'rzp_test_synthetic';
process.env.RAZORPAY_KEY_SECRET = 'synthetic_key_secret_for_tests';
process.env.RAZORPAY_WEBHOOK_SECRET = 'synthetic_webhook_secret_for_tests';
process.env.NEXTAUTH_SECRET ||= 'test-only-nextauth-secret-0123456789abcdef';
(process.env as any).NODE_ENV ||= 'test';
process.env.MONGODB_MAX_POOL_SIZE = '1';
