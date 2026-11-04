import { getOrdersCollection, flagOrderForReview } from '@/lib/db/orders';
import { getPaymentProvider, PaymentProvider } from '@/lib/payments/provider';
import { toPaise } from '@/lib/payments/confirm';
import type { DbOrder } from '@/lib/db/types';

export type RefundResult =
  | { ok: true; refundId: string | null; alreadyRefunded: boolean; amount: number }
  | { ok: false; code: 'NOT_REFUNDABLE' | 'IN_PROGRESS' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_ERROR'; message: string };

const LOCK_MS = 60_000;

/**
 * Refund the full amount of a paid online order. Money-moving, so:
 *  - only PAID, online orders with a gateway payment id qualify;
 *  - a short lease (refund.lockedUntil) makes double clicks / two admins safe;
 *  - before creating a refund we ask Razorpay for existing refunds on the payment and adopt a
 *    matching one, so a retry after a timeout can never refund twice;
 *  - the result is stored on the order; a failure leaves it retryable and flagged.
 */
export async function refundOrderInFull(
  order: DbOrder,
  actor: string,
  provider: PaymentProvider | null = getPaymentProvider()
): Promise<RefundResult> {
  const pay = order.payment;
  if (!pay || pay.paymentMethod !== 'RAZORPAY' || !pay.paymentId) {
    return { ok: false, code: 'NOT_REFUNDABLE', message: 'This order was not paid online, so there is nothing to refund through the shop.' };
  }
  if (pay.paymentStatus === 'REFUNDED' && pay.refund?.status === 'PROCESSED') {
    return { ok: true, refundId: pay.refund.razorpayRefundId || null, alreadyRefunded: true, amount: pay.refund.amount };
  }
  if (pay.paymentStatus !== 'PAID' && pay.paymentStatus !== 'REFUNDED') {
    return { ok: false, code: 'NOT_REFUNDABLE', message: 'No payment was received for this order, so there is nothing to refund.' };
  }
  if (!provider) {
    return { ok: false, code: 'PROVIDER_UNAVAILABLE', message: 'The payment gateway is not configured on the server.' };
  }

  const amountPaise = toPaise(pay.amount ?? order.total);
  const col = await getOrdersCollection();
  const now = new Date();

  // Take the lease. Fails if another refund attempt is still running.
  const claimed = await col.findOneAndUpdate(
    {
      orderNumber: order.orderNumber,
      'payment.paymentStatus': { $in: ['PAID', 'REFUNDED'] },
      $or: [{ 'payment.refund.lockedUntil': null }, { 'payment.refund.lockedUntil': { $lt: now } }, { 'payment.refund': null }],
    } as any,
    {
      $set: {
        'payment.refund': {
          status: 'INITIATED',
          amount: pay.amount ?? order.total,
          razorpayRefundId: pay.refund?.razorpayRefundId ?? null,
          initiatedBy: actor,
          initiatedAt: now,
          lockedUntil: new Date(now.getTime() + LOCK_MS),
          error: null,
        },
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );
  if (!claimed) {
    return { ok: false, code: 'IN_PROGRESS', message: 'A refund for this order is already being processed. Please wait a minute and refresh.' };
  }

  try {
    // Idempotency: adopt an existing full refund instead of creating another.
    const existing = (await provider.listRefunds(pay.paymentId)).find((r) => r.amount === amountPaise && r.status !== 'failed');
    const refund = existing || (await provider.createRefund(pay.paymentId, amountPaise, { orderNumber: order.orderNumber, by: actor.slice(0, 60) }));

    await col.updateOne(
      { orderNumber: order.orderNumber },
      {
        $set: {
          'payment.paymentStatus': 'REFUNDED',
          'payment.refund.status': 'PROCESSED',
          'payment.refund.razorpayRefundId': refund.id,
          'payment.refund.lockedUntil': null,
          updatedAt: new Date(),
        },
        $pullAll: { reviewFlags: ['REFUND_REQUIRED', 'PAID_AFTER_CANCELLATION', 'OUT_OF_STOCK_AFTER_PAYMENT', 'DUPLICATE_PAYMENT'] } as any,
      }
    );
    console.log(JSON.stringify({ event: 'order.refunded', orderNumber: order.orderNumber, refundId: refund.id, adopted: !!existing, by: actor }));
    return { ok: true, refundId: refund.id, alreadyRefunded: !!existing, amount: pay.amount ?? order.total };
  } catch (err) {
    const message = (err as any)?.error?.description || (err as Error)?.message || 'Refund failed';
    await col.updateOne(
      { orderNumber: order.orderNumber },
      { $set: { 'payment.refund.status': 'FAILED', 'payment.refund.error': String(message).slice(0, 300), 'payment.refund.lockedUntil': null, updatedAt: new Date() } }
    );
    await flagOrderForReview(order.orderNumber, 'REFUND_REQUIRED', `refund attempt failed: ${String(message).slice(0, 200)}`);
    console.error(JSON.stringify({ event: 'order.refund_failed', orderNumber: order.orderNumber, message: String(message).slice(0, 200) }));
    return { ok: false, code: 'PROVIDER_ERROR', message: 'The refund could not be completed. Nothing was refunded yet — please try again, or refund from the Razorpay dashboard.' };
  }
}
