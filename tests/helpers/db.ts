import crypto from 'crypto';
import net from 'net';
import { NextRequest } from 'next/server';
import { getDatabase, getMongoClient } from '@/lib/mongodb';
import { createOrder } from '@/lib/db/orders';
import { __resetRateLimitsForTests } from '@/lib/rate-limit';
import type { DbOrder } from '@/lib/db/types';

let mongodInstance: any = null;

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function ensureTestMongo() {
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('127.0.0.1:27017') && !process.env.MONGODB_URI.includes('localhost:27017')) {
    return;
  }
  const portOpen = await isPortOpen('127.0.0.1', 27017);
  if (portOpen) {
    return;
  }
  if (!mongodInstance) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongodInstance.getUri();
  }
}

export async function resetDb() {
  __resetRateLimitsForTests();
  await ensureTestMongo();
  const db = await getDatabase();
  await Promise.all(['orders', 'products', 'users', 'carts', 'addresses', 'auditLog'].map((c) => db.collection(c).deleteMany({})));
}

export async function dropDbAndClose() {
  try {
    const db = await getDatabase();
    await db.dropDatabase().catch(() => {});
    await (await getMongoClient()).close();
  } catch {}
  if (mongodInstance) {
    await mongodInstance.stop().catch(() => {});
    mongodInstance = null;
  }
}

export const col = async (name: string) => (await getDatabase()).collection<any>(name);

export async function seedProduct(p: { slug: string; price: number; stock: number; name?: string }) {
  await ensureTestMongo();
  const c = await col('products');
  const now = new Date();
  const res = await c.insertOne({ name: p.name || p.slug, slug: p.slug, price: p.price, stock: p.stock, image: '/x.png', createdAt: now, updatedAt: now });
  return res.insertedId.toString();
}

export async function seedOrder(o: {
  orderNumber: string; total: number; razorpayOrderId?: string | null; method?: 'RAZORPAY' | 'COD';
  orderStatus?: DbOrder['orderStatus']; paymentStatus?: DbOrder['payment']['paymentStatus'];
  items?: DbOrder['items']; firebaseUid?: string;
}) {
  await ensureTestMongo();
  return createOrder({
    orderNumber: o.orderNumber,
    firebaseUid: o.firebaseUid || 'uid_customer_a',
    customer: { name: 'Test', email: 'test@example.test', phone: '9999999999' },
    shippingAddress: { fullName: 'Test', phone: '9999999999', addressLine1: '1 Test Street', city: 'Delhi', state: 'DL', pinCode: '110001', country: 'India' },
    items: o.items || [],
    subtotal: o.total, shipping: 0, tax: 0, discount: 0, total: o.total,
    deliveryMethod: 'standard',
    orderStatus: o.orderStatus || 'PENDING',
    payment: {
      paymentStatus: o.paymentStatus || 'PENDING', paymentId: null,
      razorpayOrderId: o.razorpayOrderId === undefined ? `order_${o.orderNumber}` : o.razorpayOrderId,
      razorpaySignature: null, paymentMethod: o.method || 'RAZORPAY', amount: o.total, currency: 'INR', createdAt: new Date(),
    },
  });
}

export const getOrder = async (orderNumber: string) => (await col('orders')).findOne({ orderNumber });

export const checkoutSignature = (orderId: string, paymentId: string) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');

export const webhookSignature = (raw: string) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest('hex');

export function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}, method = 'POST') {
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function capturedEvent(p: { paymentId: string; orderId: string; amountPaise: number; notes?: Record<string, string>; status?: string; event?: string }) {
  return JSON.stringify({
    event: p.event || 'payment.captured',
    payload: { payment: { entity: { id: p.paymentId, order_id: p.orderId, amount: p.amountPaise, currency: 'INR', status: p.status || 'captured', notes: p.notes || {} } } },
  });
}
