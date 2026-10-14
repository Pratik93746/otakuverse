import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { confirmRazorpayPayment } from '@/lib/payments/confirm';

const str = (v: unknown, max = 128): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Support both standard Razorpay naming and camelCase/underscore naming
    const order_id = str(body.order_id ?? body.razorpay_order_id);
    const payment_id = str(body.payment_id ?? body.razorpay_payment_id);
    const signature = str(body.razorpay_signature ?? body.signature);
    const orderNumber = body.orderNumber === undefined ? undefined : str(body.orderNumber, 64);

    if (!order_id || !payment_id || !signature || orderNumber === null) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, payment_id, and razorpay_signature are required' },
        { status: 400 }
      );
    }

    // HMAC-SHA256(order_id|payment_id) proves Razorpay authorised this payment for this
    // gateway order. The gateway order's amount was fixed server-side at checkout.
    if (!verifyPaymentSignature({ orderId: order_id, paymentId: payment_id, signature })) {
      return NextResponse.json(
        { success: false, error: 'Signature verification failed: Invalid signature' },
        { status: 400 }
      );
    }

    const result = await confirmRazorpayPayment({
      razorpayOrderId: order_id,
      paymentId: payment_id,
      signature,
      expectedOrderNumber: orderNumber,
      source: 'verify',
    });

    if (result.ok) {
      return NextResponse.json(
        { success: true, message: 'Payment signature verified successfully', payment_id, order_id, orderNumber: result.order.orderNumber },
        { status: 200 }
      );
    }

    if (result.code === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'No order found matching the verified payment gateway transaction.' },
        { status: 404 }
      );
    }
    if (result.code === 'ORDER_MISMATCH') {
      return NextResponse.json(
        { success: false, error: 'Security violation: Order correspondence mismatch.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'This order can no longer be paid. If you were charged, our team will refund you — please contact support.' },
      { status: 409 }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Server error during payment verification' }, { status: 500 });
  }
}
