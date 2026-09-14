import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, isAllowedAdminEmail, handleAuthError } from '@/lib/firebase-admin';
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

    const isAdmin =
      verifiedUser.admin === true ||
      verifiedUser.role === 'ADMIN' ||
      isAllowedAdminEmail(verifiedUser.email);

    // Ensure customer can only view their own order unless admin
    if (order.firebaseUid !== verifiedUser.uid && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    return handleAuthError(err);
  }
}
