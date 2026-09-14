import { MongoClient, Db, Collection, Document } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
export const isPlaceholderUri = !uri || uri.includes('<username>') || uri.includes('cluster.mongodb.net');

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (isPlaceholderUri) {
  console.warn('⚠️ [MongoDB] MONGODB_URI is not set or contains placeholder credentials.');
  clientPromise = Promise.reject(new Error('MONGODB_URI contains placeholder credentials.')).catch((e) => {
    // Avoid unhandled rejection warning
    return null as any;
  });
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the MongoClient is not repeated
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export const DB_NAME = 'otakuverse';

/**
 * Get MongoClient connected instance promise
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (isPlaceholderUri) {
    throw new Error('MONGODB_URI is not configured with valid MongoDB Atlas credentials.');
  }
  const connected = await clientPromise;
  if (!connected) {
    throw new Error('Could not connect to MongoDB Atlas.');
  }
  return connected;
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
  collectionName: 'users' | 'products' | 'carts' | 'orders' | 'addresses' | string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

let indexesEnsured = false;

/**
 * Ensure collection indexes as required by architectural specifications
 */
export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured || isPlaceholderUri) return;
  try {
    const db = await getDatabase();

    // 1. users: unique index on firebaseUid
    await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true });

    // 2. products: slug (unique), categorySlug, animeSlug, brandName
    await db.collection('products').createIndex({ slug: 1 }, { unique: true });
    await db.collection('products').createIndex({ categorySlug: 1 });
    await db.collection('products').createIndex({ animeSlug: 1 });
    await db.collection('products').createIndex({ brandName: 1 });

    // 3. carts: unique index on firebaseUid
    await db.collection('carts').createIndex({ firebaseUid: 1 }, { unique: true });

    // 4. orders: orderNumber (unique), firebaseUid, createdAt, orderStatus, payment.paymentStatus
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ firebaseUid: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ orderStatus: 1 });
    await db.collection('orders').createIndex({ 'payment.paymentStatus': 1 });

    // 5. addresses: firebaseUid
    await db.collection('addresses').createIndex({ firebaseUid: 1 });

    indexesEnsured = true;
    console.log('✅ [MongoDB] Collection indexes successfully ensured');
  } catch (err) {
    console.warn('⚠️ [MongoDB] Index creation notice:', (err as Error)?.message || err);
  }
}

export default clientPromise;
