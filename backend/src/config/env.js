require('dotenv').config();

const env = {
  // Unset NODE_ENV is treated as production: CORS stays closed and error details are not leaked.
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
  MONGODB_URI: (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim().replace(/^["']|["']$/g, ''),
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '',
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'otakuverse-5fa52',
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '',
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  // No default: admin rights must be granted explicitly per deployment.
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
};

if (!env.MONGODB_URI && env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: MONGODB_URI is not set in production environment variables.');
}

module.exports = env;
