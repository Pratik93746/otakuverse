import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrderByNumber, getOrderByRazorpayOrderId, updateOrderPayment, claimAndMarkOrderPaid } from '@/lib/db/orders';
import { decrementProductStock } from '@/lib/db/products';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // 1. Mandatory cryptographic HMAC-SHA256 signature verification
    if (!signature) {
      console.error('❌ [Razorpay Webhook] Rejected: Missing x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error('❌ [Razorpay Webhook] Rejected: Server webhook secret is not configured');
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isSignatureValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isSignatureValid) {
      console.error('❌ [Razorpay Webhook] Rejected: Cryptographic signature mismatch');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`🔔 [Razorpay Webhook] Verified event received: ${event}`);

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
        // Idempotent Atomic CAS: only decrement stock if this thread flipped to PAID
        const claimed = await claimAndMarkOrderPaid(matchedOrder.orderNumber, {
          paymentId,
          razorpayOrderId: razorpayOrderId || matchedOrder.payment?.razorpayOrderId || '',
          razorpaySignature: signature,
        });

        if (claimed) {
          // Decrement stock safely once
          if (matchedOrder.items && matchedOrder.items.length > 0) {
            for (const item of matchedOrder.items) {
              const prodId = item.productId || item.slug;
              if (prodId) {
                try {
                  await decrementProductStock(prodId, item.quantity);
                } catch (stkErr) {
                  console.warn(`Could not decrement stock for ${prodId}:`, stkErr);
                }
              }
            }
          }

          console.log(`✅ [Razorpay Webhook] Order #${matchedOrder.orderNumber} successfully marked as PAID and stock decremented`);
        } else {
          console.log(`ℹ️ [Razorpay Webhook] Order #${matchedOrder.orderNumber} was already marked PAID. Skipped duplicate processing.`);
        }
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

      if (matchedOrder && matchedOrder.payment?.paymentStatus !== 'PAID') {
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
    console.error('Razorpay webhook processing error:', err);
    return NextResponse.json({ error: err?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
