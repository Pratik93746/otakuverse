import type { DbOrder, OrderStatus } from '@/lib/db/types';

/**
 * The order lifecycle, in one place.
 *
 *   PENDING ──(payment confirmed, automatic)──▶ CONFIRMED ──▶ PROCESSING ──▶ SHIPPED ──▶ DELIVERED
 *      │                                            │              │
 *      └──────────────── CANCELLED ◀────────────────┴──────────────┘
 *
 * - PENDING is only for online orders waiting for payment. COD orders start at CONFIRMED.
 * - Only a verified payment (webhook / signed checkout callback) moves PENDING to CONFIRMED.
 *   An admin cannot confirm an unpaid online order by hand.
 * - Nothing leaves SHIPPED except DELIVERED: returns/RTO are handled outside the app (see owner guide).
 * - DELIVERED and CANCELLED are final.
 */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Statuses that mean "we are fulfilling this order". Require money received (or COD). */
export const FULFILMENT_STATUSES: OrderStatus[] = ['PROCESSING', 'SHIPPED', 'DELIVERED'];

export const isCod = (o: Pick<DbOrder, 'payment'>) => o.payment?.paymentMethod === 'COD';
export const isPaid = (o: Pick<DbOrder, 'payment'>) => o.payment?.paymentStatus === 'PAID';

/** Safe to hand to the courier: payment received online, or customer pays cash on delivery. */
export const isPaymentCleared = (o: Pick<DbOrder, 'payment'>) => isPaid(o) || isCod(o);

/**
 * Whether stock is currently deducted for this order.
 * Orders created before reservations existed have no flag: COD orders deducted at checkout,
 * online orders deducted when payment was confirmed.
 */
export function isStockHeld(o: Pick<DbOrder, 'payment' | 'stockHeld'>): boolean {
  if (typeof o.stockHeld === 'boolean') return o.stockHeld;
  return isCod(o) ? true : isPaid(o);
}

export type TransitionCheck =
  | { ok: true; refundRequired: boolean }
  | { ok: false; code: 'SAME_STATUS' | 'NOT_ALLOWED' | 'PAYMENT_NOT_RECEIVED' | 'REFUND_REQUIRED'; message: string };

/**
 * Decide whether an admin may move an order to `to`.
 * `refundRequested` says the admin asked to refund the customer as part of this change.
 */
export function checkAdminTransition(order: DbOrder, to: OrderStatus, refundRequested = false): TransitionCheck {
  const from = order.orderStatus;
  if (from === to) return { ok: false, code: 'SAME_STATUS', message: `The order is already ${from.toLowerCase()}.` };

  if (!ADMIN_TRANSITIONS[from]?.includes(to)) {
    return {
      ok: false,
      code: 'NOT_ALLOWED',
      message: `An order that is ${from.toLowerCase()} cannot be changed to ${to.toLowerCase()}.`,
    };
  }

  if (FULFILMENT_STATUSES.includes(to) && !isPaymentCleared(order)) {
    return {
      ok: false,
      code: 'PAYMENT_NOT_RECEIVED',
      message: 'Payment has not been received for this order, so it cannot be packed or shipped.',
    };
  }

  if (to === 'CANCELLED') {
    const refundRequired = !isCod(order) && isPaid(order) && order.payment.paymentStatus !== 'REFUNDED';
    if (refundRequired && !refundRequested) {
      return {
        ok: false,
        code: 'REFUND_REQUIRED',
        message: 'The customer already paid online. Cancel the order together with a refund so they get their money back.',
      };
    }
    return { ok: true, refundRequired };
  }

  return { ok: true, refundRequired: false };
}

/** Which buttons the owner should see for an order. Mirrors checkAdminTransition. */
export function allowedAdminActions(order: DbOrder): OrderStatus[] {
  return (ADMIN_TRANSITIONS[order.orderStatus] || []).filter((to) => {
    const check = checkAdminTransition(order, to, true);
    return check.ok;
  });
}
