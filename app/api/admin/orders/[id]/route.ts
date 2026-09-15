import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getOrderByNumber, updateOrderStatus } from '@/lib/db/orders';
import { OrderStatus } from '@/lib/db/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminRequest(request);
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
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, tracking } = body;

    const validStatuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    // Auto-generate tracking URL if carrier & trackingNumber provided without url
    let processedTracking = tracking;
    if (tracking?.trackingNumber && tracking?.carrier && !tracking?.trackingUrl) {
      const carrierLower = tracking.carrier.toLowerCase();
      let trackingUrl = '';
      if (carrierLower.includes('delhivery')) {
        trackingUrl = `https://www.delhivery.com/track/package/${tracking.trackingNumber}`;
      } else if (carrierLower.includes('bluedart') || carrierLower.includes('blue dart')) {
        trackingUrl = `https://www.bluedart.com/tracking?trackNumber=${tracking.trackingNumber}`;
      } else if (carrierLower.includes('shiprocket')) {
        trackingUrl = `https://shiprocket.co/tracking/${tracking.trackingNumber}`;
      } else if (carrierLower.includes('dtdc')) {
        trackingUrl = `https://www.dtdc.in/tracking/shipment-tracking.asp`;
      }
      processedTracking = {
        ...tracking,
        trackingUrl: trackingUrl || undefined,
        shippedAt: new Date(),
      };
    }

    let updated = false;
    if (status) {
      updated = await updateOrderStatus(id, status, processedTracking);
    } else if (processedTracking) {
      const { updateOrderTracking } = await import('@/lib/db/orders');
      updated = await updateOrderTracking(id, processedTracking);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status,
      tracking: processedTracking,
      message: 'Order updated successfully',
    });
  } catch (err: any) {
    console.error('Admin order status PATCH error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
