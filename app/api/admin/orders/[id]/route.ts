import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateFirestoreOrderStatus, OrderStatus } from '@/lib/firestore';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    const validStatuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    // Update Firestore
    await updateFirestoreOrderStatus(id, status);

    // Update Prisma if available
    try {
      await prisma.order.update({
        where: { orderNumber: id },
        data: { status: status as any },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, status, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
