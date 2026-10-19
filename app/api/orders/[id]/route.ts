import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { authenticateAdmin } from '@/lib/admin-auth';
import { getOrderByNumber } from '@/lib/db/orders';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const verifiedUser = await requireFirebaseUser(request);
    const { id } = await context.params;

    const order = await getOrderByNumber(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Customers may only read their own orders. Admin status is decided by the same
    // verified checks as every other admin endpoint (verified email / DB role / claim).
    const isOwner = order.firebaseUid === verifiedUser.uid;
    const isAdmin = !isOwner && (await authenticateAdmin(request)) !== null;
    if (!isOwner && !isAdmin) {
      // Same answer as "not found" so order numbers cannot be probed.
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (isOwner) {
      // Customers never need gateway internals or internal review notes.
      const { payment, reviewFlags: _flags, statusHistory: _history, ...rest } = order as any;
      const { razorpaySignature: _sig, refund: _refund, ...safePayment } = payment || {};
      return NextResponse.json({ order: { ...rest, payment: safePayment } });
    }

    return NextResponse.json({ order });
  } catch (err) {
    return handleAuthError(err);
  }
}
