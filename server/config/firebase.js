const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    let serviceAccountCredentials = null;

    if (rawKey) {
      const trimmed = rawKey.trim();

      if (trimmed.startsWith('{')) {
        // Direct JSON string
        serviceAccountCredentials = JSON.parse(trimmed);
      } else if (fs.existsSync(path.resolve(process.cwd(), trimmed))) {
        // Relative or absolute file path
        const fileContent = fs.readFileSync(path.resolve(process.cwd(), trimmed), 'utf8');
        serviceAccountCredentials = JSON.parse(fileContent);
      } else {
        // Base64 encoded JSON string
        try {
          const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
          serviceAccountCredentials = JSON.parse(decoded);
        } catch {
          throw new Error('Unable to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON, file path, or Base64 string.');
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountCredentials)
      });
      console.log('[Firebase] Admin SDK initialized with Service Account credentials.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('[Firebase] Admin SDK initialized with Application Default Credentials.');
    } else {
      console.warn('[Firebase] Warning: No service account credentials found. Initializing with default app context.');
      admin.initializeApp();
    }

    return admin;
  } catch (error) {
    console.error(`[Firebase] Initialization failure: ${error.message}`);
    throw error;
  }
};

const firebaseAdmin = initializeFirebase();

module.exports = firebaseAdmin;
