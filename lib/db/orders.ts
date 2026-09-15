import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbOrder, OrderStatus, PaymentStatus, OrderTracking } from './types';

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
  const col = await getOrdersCollection();
  return await col.findOne({ orderNumber });
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string): Promise<DbOrder | null> {
  const col = await getOrdersCollection();
  return await col.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
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
  status: OrderStatus,
  tracking?: OrderTracking
): Promise<boolean> {
  const col = await getOrdersCollection();
  const updateDoc: any = {
    orderStatus: status,
    updatedAt: new Date(),
  };

  if (tracking) {
    if (tracking.carrier !== undefined) updateDoc['tracking.carrier'] = tracking.carrier;
    if (tracking.trackingNumber !== undefined) updateDoc['tracking.trackingNumber'] = tracking.trackingNumber;
    if (tracking.trackingUrl !== undefined) updateDoc['tracking.trackingUrl'] = tracking.trackingUrl;
    if (tracking.shippedAt !== undefined) updateDoc['tracking.shippedAt'] = tracking.shippedAt;
  }

  const res = await col.updateOne(
    { orderNumber },
    { $set: updateDoc }
  );
  return res.matchedCount > 0;
}

export async function updateOrderTracking(
  orderNumber: string,
  tracking: OrderTracking
): Promise<boolean> {
  const col = await getOrdersCollection();
  const res = await col.updateOne(
    { orderNumber },
    {
      $set: {
        tracking: {
          ...tracking,
          shippedAt: tracking.shippedAt || new Date(),
        },
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
