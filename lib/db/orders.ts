import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbOrder, OrderStatus, PaymentStatus, OrderTracking, OrderReviewFlag } from './types';

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

/**
 * Atomically move a Razorpay order from awaiting-payment to PAID.
 *
 * The filter is the whole safety check: the order must be bound to this exact
 * gateway order id, be an online-payment order, still be PENDING (not cancelled,
 * not shipped) and not already paid. Exactly one caller can win; everyone else
 * gets null. Returns the order as it was before the update.
 */
export async function claimAndMarkOrderPaid(
  razorpayOrderId: string,
  paymentData: { paymentId: string; razorpaySignature?: string | null; by: string }
): Promise<DbOrder | null> {
  if (!razorpayOrderId || !paymentData.paymentId) return null;
  const col = await getOrdersCollection();
  const now = new Date();

  return await col.findOneAndUpdate(
    {
      'payment.razorpayOrderId': razorpayOrderId,
      'payment.paymentMethod': 'RAZORPAY',
      'payment.paymentStatus': { $in: ['PENDING', 'FAILED'] },
      orderStatus: 'PENDING',
    },
    {
      $set: {
        'payment.paymentStatus': 'PAID',
        'payment.paymentId': paymentData.paymentId,
        'payment.razorpaySignature': paymentData.razorpaySignature || null,
        orderStatus: 'CONFIRMED',
        paidAt: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: { at: now, from: 'PENDING', to: 'CONFIRMED', by: paymentData.by, note: `payment ${paymentData.paymentId}` },
      } as any,
    },
    { returnDocument: 'before' }
  );
}

/**
 * Record a failed attempt on an order that is still awaiting payment.
 * Never touches paid, cancelled or COD orders and never rewrites the gateway binding,
 * so a failed attempt cannot block the customer's later successful retry.
 */
export async function markRazorpayPaymentFailed(razorpayOrderId: string, paymentId?: string): Promise<boolean> {
  if (!razorpayOrderId) return false;
  const col = await getOrdersCollection();
  const res = await col.updateOne(
    {
      'payment.razorpayOrderId': razorpayOrderId,
      'payment.paymentMethod': 'RAZORPAY',
      'payment.paymentStatus': 'PENDING',
      orderStatus: 'PENDING',
    },
    { $set: { 'payment.paymentStatus': 'FAILED', 'payment.lastFailedPaymentId': paymentId || null, updatedAt: new Date() } }
  );
  return res.modifiedCount === 1;
}

/** Attach a problem flag the owner must look at. Idempotent per flag. */
export async function flagOrderForReview(orderNumber: string, flag: OrderReviewFlag, detail?: string): Promise<void> {
  const col = await getOrdersCollection();
  await col.updateOne(
    { orderNumber },
    { $addToSet: { reviewFlags: flag } as any, $set: { updatedAt: new Date() } }
  );
  console.error(JSON.stringify({ event: 'order.review_flag', orderNumber, flag, detail: detail || null }));
}

/** Attach the Razorpay order id to an order that is still awaiting payment. */
export async function bindRazorpayOrder(orderNumber: string, razorpayOrderId: string): Promise<boolean> {
  const col = await getOrdersCollection();
  const res = await col.updateOne(
    { orderNumber, 'payment.paymentMethod': 'RAZORPAY', 'payment.razorpayOrderId': null, orderStatus: 'PENDING' },
    { $set: { 'payment.razorpayOrderId': razorpayOrderId, updatedAt: new Date() } }
  );
  return res.modifiedCount === 1;
}

/** Close an online order that never reached the gateway (no money taken, no stock held). */
export async function markOrderAbandoned(orderNumber: string, note: string): Promise<void> {
  const col = await getOrdersCollection();
  const now = new Date();
  await col.updateOne(
    { orderNumber, orderStatus: 'PENDING', 'payment.paymentStatus': { $ne: 'PAID' } },
    {
      $set: { orderStatus: 'CANCELLED', 'payment.paymentStatus': 'FAILED', updatedAt: now },
      $push: { statusHistory: { at: now, from: 'PENDING', to: 'CANCELLED', by: 'system:checkout', note } } as any,
    }
  );
}

export async function countOpenCodOrders(firebaseUid: string): Promise<number> {
  const col = await getOrdersCollection();
  return await col.countDocuments({
    firebaseUid,
    'payment.paymentMethod': 'COD',
    orderStatus: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] },
  });
}

/** True if the customer already has a live (not cancelled/failed) order using this coupon. */
export async function hasUsedCoupon(firebaseUid: string, couponCode: string): Promise<boolean> {
  const col = await getOrdersCollection();
  const n = await col.countDocuments({
    firebaseUid,
    couponCode,
    orderStatus: { $ne: 'CANCELLED' },
    'payment.paymentStatus': { $ne: 'FAILED' },
  });
  return n > 0;
}
