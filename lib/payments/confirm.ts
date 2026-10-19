import {
  claimAndMarkOrderPaid,
  flagOrderForReview,
  getOrderByRazorpayOrderId,
  setStockHeld,
} from '@/lib/db/orders';
import { isStockHeld } from '@/lib/orders/lifecycle';
import { decrementProductStock } from '@/lib/db/products';
import { DbOrder } from '@/lib/db/types';
import { getPaymentProvider } from '@/lib/payments/provider';

export type ConfirmResult =
  | { ok: true; order: DbOrder; alreadyProcessed: boolean }
  | { ok: false; code: 'ORDER_NOT_FOUND' | 'ORDER_MISMATCH' | 'AMOUNT_MISMATCH' | 'NOT_PAYABLE' | 'PROVIDER_UNAVAILABLE' | 'NOT_CAPTURED'; order?: DbOrder };

export function toPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}

/**
 * Single place where a Razorpay payment turns an order into a paid order.
 * Used by both the browser callback (/api/verify-payment) and the webhook, so the
 * two can race freely: the conditional update guarantees one winner, and stock
 * is decremented exactly once by that winner.
 *
 * Callers must have authenticated the payment (checkout signature or webhook HMAC)
 * before calling this. The order is located only by the gateway order id the server
 * stored when it created the Razorpay order; nothing the client or payment notes
 * claim about which order is being paid is trusted.
 */
export async function confirmRazorpayPayment(input: {
  razorpayOrderId: string;
  paymentId: string;
  signature?: string | null;
  /** Amount actually paid, in paise, when the source reports it (webhook). */
  amountPaise?: number;
  currency?: string;
  /** If the caller names an order, it must be the bound one. */
  expectedOrderNumber?: string;
  source: 'verify' | 'webhook';
}): Promise<ConfirmResult> {
  const by = `system:${input.source}`;
  const order = await getOrderByRazorpayOrderId(input.razorpayOrderId);

  if (!order) {
    console.error(JSON.stringify({
      event: 'payment.unmatched',
      source: input.source,
      razorpayOrderId: input.razorpayOrderId,
      paymentId: input.paymentId,
    }));
    return { ok: false, code: 'ORDER_NOT_FOUND' };
  }

  if (input.expectedOrderNumber && input.expectedOrderNumber !== order.orderNumber) {
    console.error(JSON.stringify({
      event: 'payment.order_mismatch',
      source: input.source,
      boundOrder: order.orderNumber,
      claimedOrder: String(input.expectedOrderNumber).slice(0, 64),
    }));
    return { ok: false, code: 'ORDER_MISMATCH' };
  }

  // The browser callback is only a signed hint. Ask Razorpay itself what happened to this payment:
  // it must belong to this gateway order, be captured, and match the amount and currency.
  // If Razorpay cannot be reached we fail closed; the webhook will still complete the order.
  if (input.source === 'verify') {
    const provider = getPaymentProvider();
    if (!provider) return { ok: false, code: 'PROVIDER_UNAVAILABLE' };
    try {
      let payment = await provider.fetchPayment(input.paymentId);
      if (payment.order_id !== input.razorpayOrderId) {
        console.error(JSON.stringify({ event: 'payment.provider_order_mismatch', paymentId: input.paymentId, boundOrder: order.orderNumber }));
        return { ok: false, code: 'ORDER_MISMATCH' };
      }
      if (payment.status === 'authorized') {
        payment = await provider.capturePayment(input.paymentId, toPaise(order.payment.amount ?? order.total), 'INR');
      }
      if (payment.status !== 'captured') {
        return { ok: false, code: 'NOT_CAPTURED', order };
      }
      input = { ...input, amountPaise: payment.amount, currency: payment.currency };
    } catch (err) {
      console.error(JSON.stringify({ event: 'payment.provider_error', source: 'verify', paymentId: input.paymentId, message: (err as Error)?.message }));
      return { ok: false, code: 'PROVIDER_UNAVAILABLE' };
    }
  }

  if (input.amountPaise !== undefined) {
    const expected = toPaise(order.payment.amount ?? order.total);
    const currency = (input.currency || 'INR').toUpperCase();
    if (input.amountPaise !== expected || currency !== (order.payment.currency || 'INR').toUpperCase()) {
      await flagOrderForReview(order.orderNumber, 'AMOUNT_MISMATCH', `paid ${input.amountPaise} ${currency}, expected ${expected}`);
      return { ok: false, code: 'AMOUNT_MISMATCH', order };
    }
  }

  const claimed = await claimAndMarkOrderPaid(input.razorpayOrderId, {
    paymentId: input.paymentId,
    razorpaySignature: input.signature ?? null,
    by,
  });

  if (claimed) {
    // Stock was already reserved when the order was created: do not take it twice.
    // Orders without a reservation (created before reservations existed) deduct now.
    if (!isStockHeld(claimed)) {
      const shortfalls: string[] = [];
      const taken: { id: string; qty: number }[] = [];
      for (const item of claimed.items || []) {
        const prodId = item.productId || item.slug;
        if (!prodId) continue;
        if (await decrementProductStock(prodId, item.quantity)) taken.push({ id: prodId, qty: item.quantity });
        else shortfalls.push(`${prodId} x${item.quantity}`);
      }
      await setStockHeld(claimed.orderNumber, true);
      if (shortfalls.length) {
        await flagOrderForReview(claimed.orderNumber, 'OUT_OF_STOCK_AFTER_PAYMENT', shortfalls.join(', '));
      }
    }
    console.log(JSON.stringify({ event: 'order.paid', source: input.source, orderNumber: claimed.orderNumber, paymentId: input.paymentId }));
    return { ok: true, order: claimed, alreadyProcessed: false };
  }

  // Lost the race or the order is not payable. Work out which.
  const current = (await getOrderByRazorpayOrderId(input.razorpayOrderId)) || order;
  if (current.payment.paymentStatus === 'PAID') {
    if (current.payment.paymentId === input.paymentId) {
      return { ok: true, order: current, alreadyProcessed: true };
    }
    await flagOrderForReview(current.orderNumber, 'DUPLICATE_PAYMENT', `extra payment ${input.paymentId}`);
    return { ok: false, code: 'NOT_PAYABLE', order: current };
  }
  if (current.orderStatus === 'CANCELLED') {
    await flagOrderForReview(current.orderNumber, 'PAID_AFTER_CANCELLATION', `payment ${input.paymentId}`);
  }
  return { ok: false, code: 'NOT_PAYABLE', order: current };
}
