import { MongoClient, Db, Collection, Document } from 'mongodb';

const rawUri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
const isPlaceholder =
  !rawUri ||
  rawUri.includes('<username>') ||
  rawUri.includes('<password>') ||
  rawUri.includes('your-username') ||
  (rawUri.includes('@cluster.mongodb.net') && !rawUri.includes('cluster0'));

export const isPlaceholderUri = isPlaceholder;

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

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

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(currentUri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    client = new MongoClient(currentUri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

if (!isPlaceholder && typeof window === 'undefined') {
  try {
    initMongoClient();
  } catch {
    // Handled during runtime calls
  }
}

export const DB_NAME = 'otakuverse';

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
