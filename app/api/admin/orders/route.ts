import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser, handleAuthError } from '@/lib/firebase-admin';
import { getAllOrders } from '@/lib/db/orders';

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);
    const orders = await getAllOrders();

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o._id?.toString() || o.orderNumber,
        orderNumber: o.orderNumber,
        firebaseUid: o.firebaseUid,
        customerName: o.customer?.name || 'Valued Collector',
        customerEmail: o.customer?.email || '',
        customerPhone: o.customer?.phone || o.shippingAddress?.phone || '',
        customer: o.customer,
        shippingAddress: o.shippingAddress,
        items: o.items || [],
        subtotal: o.subtotal,
        shipping: o.shipping,
        tax: o.tax,
        discount: o.discount,
        total: o.total,
        couponCode: o.couponCode,
        deliveryMethod: o.deliveryMethod,
        orderStatus: o.orderStatus,
        status: o.orderStatus,
        payment: o.payment,
        paymentStatus: o.payment?.paymentStatus || 'PENDING',
        paymentMethod: o.payment?.paymentMethod || 'RAZORPAY',
        createdAt: o.createdAt?.toISOString(),
        updatedAt: o.updatedAt?.toISOString(),
      })),
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
