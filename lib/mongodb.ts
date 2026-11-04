import { MongoClient, Db, Collection, Document } from 'mongodb';

const rawUri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
const isPlaceholder =
  !rawUri ||
  rawUri.includes('<username>') ||
  rawUri.includes('<password>') ||
  rawUri.includes('your-username') ||
  (rawUri.includes('@cluster.mongodb.net') && !rawUri.includes('cluster0'));

export const isPlaceholderUri = isPlaceholder;

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let currentClientUri = '';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function initMongoClient(): Promise<MongoClient> {
  const currentUri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');

  if (!currentUri) {
    throw new Error(
      'MONGODB_URI is not set in environment variables. Please add MONGODB_URI to your Vercel Project Settings (Settings -> Environment Variables) and redeploy.'
    );
  }

  if (
    currentUri.includes('<username>') ||
    currentUri.includes('<password>') ||
    currentUri.includes('your-username')
  ) {
    throw new Error('MONGODB_URI is not configured with valid MongoDB Atlas credentials.');
  }

  // If URI changed (e.g. during test setup dynamically swapping to MongoMemoryServer), reset client
  if (currentClientUri !== currentUri) {
    if (client) {
      client.close().catch(() => {});
    }
    client = null;
    clientPromise = null;
    global._mongoClientPromise = undefined;
    currentClientUri = currentUri;
    indexesEnsured = false;
  }

  const currentOptions = {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    serverSelectionTimeoutMS: 5000,
  };

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(currentUri, currentOptions);
      global._mongoClientPromise = client.connect().catch((err) => {
        global._mongoClientPromise = undefined;
        client = null;
        throw err;
      });
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    client = new MongoClient(currentUri, currentOptions);
    // Do not cache rejected promise forever on connection failure
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      client = null;
      throw err;
    });
  }
  return clientPromise;
}

// MONGODB_DB_NAME lets tests and staging use an isolated database.
export const DB_NAME = (process.env.MONGODB_DB_NAME || 'otakuverse').trim();

/**
 * Get MongoClient connected instance promise
 */
export async function getMongoClient(): Promise<MongoClient> {
  return initMongoClient();
}

/**
 * Get MongoDB database instance for 'otakuverse'
 */
export async function getDatabase(dbName: string = DB_NAME): Promise<Db> {
  const connectedClient = await getMongoClient();
  return connectedClient.db(dbName);
}

/**
 * Helper to get a typed collection
 */
export async function getCollection<T extends Document>(
  collectionName: 'users' | 'products' | 'carts' | 'orders' | 'addresses' | 'auditLog' | string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

let indexesEnsured = false;
let indexPromise: Promise<void> | null = null;

/**
 * Ensure collection indexes as required by architectural specifications
 */
export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured || isPlaceholderUri) return;
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    try {
      const db = await getDatabase();

      await Promise.allSettled([
        // 1. users: unique index on firebaseUid
        db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true }),

        // 2. products: slug (unique), categorySlug, animeSlug, brandName
        db.collection('products').createIndex({ slug: 1 }, { unique: true }),
        db.collection('products').createIndex({ categorySlug: 1 }),
        db.collection('products').createIndex({ animeSlug: 1 }),
        db.collection('products').createIndex({ brandName: 1 }),

        // 3. carts: unique index on firebaseUid
        db.collection('carts').createIndex({ firebaseUid: 1 }, { unique: true }),

        // 4. orders: orderNumber (unique), firebaseUid, createdAt, orderStatus, payment.paymentStatus, razorpayOrderId
        db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true }),
        db.collection('orders').createIndex({ firebaseUid: 1 }),
        db.collection('orders').createIndex({ createdAt: -1 }),
        db.collection('orders').createIndex({ orderStatus: 1 }),
        db.collection('orders').createIndex({ 'payment.paymentStatus': 1 }),
        db.collection('orders').createIndex(
          { 'payment.razorpayOrderId': 1 },
          { unique: true, partialFilterExpression: { 'payment.razorpayOrderId': { $type: 'string' } } }
        ),
        db.collection('orders').createIndex({ orderStatus: 1, stockHeld: 1, reservationExpiresAt: 1 }),
        db.collection('orders').createIndex(
          { firebaseUid: 1, idempotencyKey: 1 },
          { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
        ),

        // Once-per-customer coupons: the database itself refuses a second live order with the same coupon.
        db.collection('orders').createIndex(
          { firebaseUid: 1, couponOnceKey: 1 },
          { unique: true, partialFilterExpression: { couponOnceKey: { $type: 'string' } } }
        ),

        // 5. addresses: firebaseUid
        db.collection('addresses').createIndex({ firebaseUid: 1 }),

        // 6. auditLog: target and actor timelines
        db.collection('auditLog').createIndex({ target: 1, at: -1 }),
        db.collection('auditLog').createIndex({ actor: 1, at: -1 }),
      ]);

      indexesEnsured = true;
    } catch (err) {
      console.warn('⚠️ [MongoDB] Index creation notice:', (err as Error)?.message || err);
      indexesEnsured = true;
    } finally {
      indexPromise = null;
    }
  })();

  return indexPromise;
}

export default clientPromise;
