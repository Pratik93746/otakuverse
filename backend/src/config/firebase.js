const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const env = require('./env');

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    // 1. Direct credentials via separate env vars (matches otakuverse/.env.local)
    if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY,
        }),
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      });
      console.log('✅ [Firebase Admin] Initialized with Client Email & Private Key.');
      return admin;
    }

    // 2. Service Account JSON / File / Base64 string
    const rawKey = env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawKey) {
      let serviceAccountCredentials = null;
      const trimmed = rawKey.trim();

      if (trimmed.startsWith('{')) {
        serviceAccountCredentials = JSON.parse(trimmed);
      } else if (fs.existsSync(path.resolve(process.cwd(), trimmed))) {
        const fileContent = fs.readFileSync(path.resolve(process.cwd(), trimmed), 'utf8');
        serviceAccountCredentials = JSON.parse(fileContent);
      } else {
        try {
          const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
          serviceAccountCredentials = JSON.parse(decoded);
        } catch {
          throw new Error('Unable to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON, file path, or Base64 string.');
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountCredentials),
        projectId: serviceAccountCredentials.project_id || env.FIREBASE_ADMIN_PROJECT_ID,
      });
      console.log('✅ [Firebase Admin] Initialized with Service Account JSON credentials.');
      return admin;
    }

    // 3. Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      });
      console.log('✅ [Firebase Admin] Initialized with Application Default Credentials.');
      return admin;
    }

    // 4. Default project context
    admin.initializeApp({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    });
    console.warn('⚠️ [Firebase Admin] Initialized with project ID context only.');
    return admin;
  } catch (error) {
    console.warn(`⚠️ [Firebase Admin] Initialization warning: ${error.message}`);
    return admin;
  }
};

const firebaseAdmin = initializeFirebaseAdmin();

module.exports = firebaseAdmin;
