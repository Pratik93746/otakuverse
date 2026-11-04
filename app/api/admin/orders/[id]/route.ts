import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { getOrderByNumber, transitionOrderStatus, restockOrderOnce, flagOrderForReview } from '@/lib/db/orders';
import { recordAudit } from '@/lib/db/audit';
import { checkAdminTransition } from '@/lib/orders/lifecycle';
import { refundOrderInFull } from '@/lib/payments/refund';
import { ORDER_STATUSES, parseTracking } from '@/lib/validation/order';
import { isStockHeld, isCod } from '@/lib/orders/lifecycle';
import { OrderStatus } from '@/lib/db/types';

const forbidden = () => NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
const fail = (label: string, err: unknown) => {
  console.error(`Admin order ${label} error:`, err);
  return NextResponse.json({ error: 'Something went wrong on our side. Nothing was changed — please try again.' }, { status: 500 });
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await authenticateAdmin(request))) return forbidden();
    const { id } = await context.params;
    const order = await getOrderByNumber(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return fail('GET', err);
  }
}

/**
 * Change an order's fulfilment status. Rules live in lib/orders/lifecycle.ts:
 * legal transitions only, no shipping unpaid online orders, paid online orders are cancelled
 * together with a refund, stock is returned exactly once on cancel.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) return forbidden();

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const status = body.status as OrderStatus | undefined;
    if (status !== undefined && !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }
    const tracking = parseTracking(body.tracking);
    if (tracking.error) return NextResponse.json({ error: tracking.error }, { status: 400 });

    const order = await getOrderByNumber(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Tracking details only (no status change): allowed once the order is being fulfilled.
    if (!status) {
      if (!tracking.value) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
      if (!['PROCESSING', 'SHIPPED'].includes(order.orderStatus)) {
        return NextResponse.json({ error: 'Tracking can only be added while the order is being packed or shipped.' }, { status: 409 });
      }
      const { getOrdersCollection } = await import('@/lib/db/orders');
      const col = await getOrdersCollection();
      await col.updateOne({ orderNumber: id }, { $set: { 'tracking.carrier': tracking.value.carrier, 'tracking.trackingNumber': tracking.value.trackingNumber, 'tracking.trackingUrl': tracking.value.trackingUrl ?? null, updatedAt: new Date() } });
      await recordAudit({ actor: actor.email, action: 'order.tracking', target: id, detail: { carrier: tracking.value.carrier, trackingNumber: tracking.value.trackingNumber } });
      return NextResponse.json({ success: true, tracking: tracking.value });
    }

    const refundRequested = body.refund === true;
    const check = checkAdminTransition(order, status, refundRequested);
    if (!check.ok) {
      return NextResponse.json({ error: check.message, code: check.code }, { status: check.code === 'REFUND_REQUIRED' ? 409 : 409 });
    }

    // Refund first: if the money cannot be returned, the order stays as it is.
    let refundInfo: { refundId: string | null; amount: number } | undefined;
    if (status === 'CANCELLED' && check.refundRequired) {
      const audited = await recordAudit({ actor: actor.email, action: 'order.refund_attempt', target: id, detail: { amount: order.payment.amount } });
      if (!audited) return NextResponse.json({ error: 'Could not record the action in the audit log, so the refund was not attempted.' }, { status: 503 });
      const refund = await refundOrderInFull(order, actor.email);
      if (!refund.ok) return NextResponse.json({ error: refund.message, code: refund.code }, { status: refund.code === 'IN_PROGRESS' ? 409 : 502 });
      refundInfo = { refundId: refund.refundId, amount: refund.amount };
    }

    const updated = await transitionOrderStatus(id, order.orderStatus, status, actor.email, {
      tracking: status === 'SHIPPED' ? tracking.value : undefined,
      note: refundInfo ? `refunded ₹${refundInfo.amount}` : undefined,
      markPaid: status === 'DELIVERED' && isCod(order),
    });
    if (!updated) {
      return NextResponse.json({ error: 'This order was just changed by someone else. Please refresh the page and check its status.' }, { status: 409 });
    }

    if (status === 'CANCELLED' && isStockHeld(order)) await restockOrderOnce(order);
    if (status === 'CANCELLED' && !refundInfo && order.reviewFlags?.length) {
      // Cancelled by hand with nothing to refund: stale warnings no longer apply.
      const { getOrdersCollection } = await import('@/lib/db/orders');
      await (await getOrdersCollection()).updateOne({ orderNumber: id }, { $pullAll: { reviewFlags: ['OUT_OF_STOCK_AFTER_PAYMENT'] } as any });
    }

    await recordAudit({
      actor: actor.email,
      action: 'order.status',
      target: id,
      detail: { from: order.orderStatus, to: status, ...(refundInfo ? { refunded: refundInfo.amount } : {}) },
    });

    return NextResponse.json({ success: true, status, refunded: refundInfo?.amount, message: 'Order updated successfully' });
  } catch (err) {
    return fail('PATCH', err);
  }
}

/** Refund a paid online order that is already cancelled (e.g. a late payment on an expired order). */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) return forbidden();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'refund') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    const order = await getOrderByNumber(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.orderStatus !== 'CANCELLED') {
      return NextResponse.json({ error: 'To refund an active order, use "Cancel and refund".' }, { status: 409 });
    }
    const audited = await recordAudit({ actor: actor.email, action: 'order.refund_attempt', target: id, detail: { amount: order.payment.amount } });
    if (!audited) return NextResponse.json({ error: 'Could not record the action in the audit log, so the refund was not attempted.' }, { status: 503 });
    const refund = await refundOrderInFull(order, actor.email);
    if (!refund.ok) return NextResponse.json({ error: refund.message, code: refund.code }, { status: refund.code === 'IN_PROGRESS' ? 409 : 502 });
    await recordAudit({ actor: actor.email, action: 'order.refunded', target: id, detail: { refundId: refund.refundId, amount: refund.amount } });
    return NextResponse.json({ success: true, refunded: refund.amount });
  } catch (err) {
    return fail('POST', err);
  }
}
