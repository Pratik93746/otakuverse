import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrderByNumber, getOrderByRazorpayOrderId, updateOrderPayment } from '@/lib/db/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // 1. Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('❌ [Razorpay Webhook] Invalid signature received');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`🔔 [Razorpay Webhook] Event received: ${event}`);

    // 2. Handle successful payment events
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const orderNumber = paymentEntity?.notes?.orderNumber;

      let matchedOrder = null;
      if (orderNumber) {
        matchedOrder = await getOrderByNumber(orderNumber);
      }
      if (!matchedOrder && razorpayOrderId) {
        matchedOrder = await getOrderByRazorpayOrderId(razorpayOrderId);
      }

      if (matchedOrder) {
        await updateOrderPayment(matchedOrder.orderNumber, {
          paymentStatus: 'PAID',
          paymentId,
          razorpayOrderId,
          razorpaySignature: signature || undefined,
        });
        console.log(`✅ [Razorpay Webhook] Order #${matchedOrder.orderNumber} successfully marked as PAID`);
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const orderNumber = paymentEntity?.notes?.orderNumber;

      let matchedOrder = null;
      if (orderNumber) {
        matchedOrder = await getOrderByNumber(orderNumber);
      }
      if (!matchedOrder && razorpayOrderId) {
        matchedOrder = await getOrderByRazorpayOrderId(razorpayOrderId);
      }

      if (matchedOrder) {
        await updateOrderPayment(matchedOrder.orderNumber, {
          paymentStatus: 'FAILED',
          paymentId: paymentEntity?.id,
          razorpayOrderId,
        });
        console.log(`⚠️ [Razorpay Webhook] Order #${matchedOrder.orderNumber} marked as FAILED`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Razorpay webhook error:', err);
    return NextResponse.json({ error: err?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
