import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbOrder, OrderStatus, PaymentStatus } from './types';

export async function getOrdersCollection() {
  await ensureIndexes();
  return await getCollection<DbOrder>('orders');
}

export async function createOrder(
  orderData: Omit<DbOrder, '_id' | 'createdAt' | 'updatedAt'>
): Promise<DbOrder> {
  const col = await getOrdersCollection();
  const now = new Date();

  const newOrder: DbOrder = {
    ...orderData,
    createdAt: now,
    updatedAt: now,
  };

  const res = await col.insertOne(newOrder as any);
  return { ...newOrder, _id: res.insertedId };
}

export async function getOrderByNumber(orderNumber: string): Promise<DbOrder | null> {
  if (!orderNumber) return null;
  const col = await getOrdersCollection();
  return await col.findOne({ orderNumber });
}

export async function getUserOrders(firebaseUid: string): Promise<DbOrder[]> {
  if (!firebaseUid) return [];
  const col = await getOrdersCollection();
  return await col.find({ firebaseUid }).sort({ createdAt: -1 }).toArray();
}

export async function getAllOrders(): Promise<DbOrder[]> {
  const col = await getOrdersCollection();
  return await col.find({}).sort({ createdAt: -1 }).toArray();
}

export async function updateOrderStatus(
  orderNumber: string,
  status: OrderStatus
): Promise<boolean> {
  const col = await getOrdersCollection();
  const res = await col.updateOne(
    { orderNumber },
    {
      $set: {
        orderStatus: status,
        updatedAt: new Date(),
      },
    }
  );
  return res.matchedCount > 0;
}

export async function updateOrderPayment(
  orderNumber: string,
  paymentData: {
    paymentStatus: PaymentStatus;
    paymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }
): Promise<boolean> {
  const col = await getOrdersCollection();
  const now = new Date();

  const res = await col.updateOne(
    { orderNumber },
    {
      $set: {
        'payment.paymentStatus': paymentData.paymentStatus,
        'payment.paymentId': paymentData.paymentId || null,
        'payment.razorpayOrderId': paymentData.razorpayOrderId || null,
        'payment.razorpaySignature': paymentData.razorpaySignature || null,
        orderStatus: paymentData.paymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING',
        updatedAt: now,
      },
    }
  );
  return res.matchedCount > 0;
}
