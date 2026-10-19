import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { markRazorpayPaymentFailed } from '@/lib/db/orders';
import { confirmRazorpayPayment } from '@/lib/payments/confirm';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256 * 1024;

function signatureMatches(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf-8');
  const b = Buffer.from(signature, 'utf-8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Webhooks use a distinct secret configured in the Razorpay dashboard. Never fall
    // back to the merchant API key secret, even when the deployment is misconfigured.
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      console.error('❌ [Razorpay Webhook] Rejected: Missing x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error('❌ [Razorpay Webhook] Rejected: Server webhook secret is not configured');
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
    }

    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES || !signatureMatches(rawBody, signature, webhookSecret)) {
      console.error('❌ [Razorpay Webhook] Rejected: Cryptographic signature mismatch');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event: string = payload.event;
    const payment = payload.payload?.payment?.entity;

    // Orders are located ONLY by the gateway order id we stored at checkout.
    // payment.notes are deliberately ignored: they are not proof of which order was paid.
    if (event === 'payment.captured' || event === 'order.paid') {
      if (!payment?.id || !payment?.order_id || payment.status !== 'captured') {
        console.warn(JSON.stringify({ event: 'webhook.ignored', reason: 'not a captured payment', webhookEvent: event }));
        return NextResponse.json({ received: true });
      }

      const result = await confirmRazorpayPayment({
        razorpayOrderId: payment.order_id,
        paymentId: payment.id,
        amountPaise: Number(payment.amount),
        currency: payment.currency,
        source: 'webhook',
      });
      console.log(JSON.stringify({
        event: 'webhook.processed',
        webhookEvent: event,
        paymentId: payment.id,
        result: result.ok ? (result.alreadyProcessed ? 'duplicate' : 'paid') : result.code,
      }));
    } else if (event === 'payment.failed') {
      if (payment?.order_id) {
        const changed = await markRazorpayPaymentFailed(payment.order_id, payment.id);
        console.log(JSON.stringify({ event: 'webhook.processed', webhookEvent: event, paymentId: payment.id, result: changed ? 'failed' : 'ignored' }));
      }
    }

    // 200 for every authentic event we have recorded, so Razorpay does not retry.
    // Anomalies are flagged on the order and logged for the owner instead.
    return NextResponse.json({ received: true });
  } catch (err) {
    // 5xx makes Razorpay retry, which is what we want for transient DB failures.
    console.error('Razorpay webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
