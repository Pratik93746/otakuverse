import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser, isAllowedAdminEmail } from '@/lib/firebase-admin';
import { getOrderByNumber, updateOrderStatus } from '@/lib/db/orders';
import { OrderStatus } from '@/lib/db/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  // 1. Try Firebase Bearer Token
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await requireAdminUser(request);
      return true;
    } catch {
      // fallback to NextAuth session
    }
  }

  // 2. Try NextAuth session cookie
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      if (session.user.role === 'ADMIN' || (session.user.email && isAllowedAdminEmail(session.user.email))) {
        return true;
      }
    }
  } catch {
    // ignore
  }

  return false;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { id } = await context.params;
    const order = await getOrderByNumber(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error('Admin order GET error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
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

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status,
      message: `Order status updated to ${status}`,
    });
  } catch (err: any) {
    console.error('Admin order status PATCH error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
