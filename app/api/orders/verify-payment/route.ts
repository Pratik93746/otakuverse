import { NextRequest, NextResponse } from 'next/server';
import { updateOrderPayment, getOrderByNumber } from '@/lib/db/orders';
import { verifyPaymentSignature } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderNumber } =
      await request.json();

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify signature if Razorpay keys are configured
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret) {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json(
          { error: 'Missing payment signature verification fields' },
          { status: 400 }
        );
      }
      const isValid = verifyPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    // Update order payment status in MongoDB
    await updateOrderPayment(orderNumber, {
      paymentStatus: 'PAID',
      paymentId: razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });

    return NextResponse.json({ success: true, message: 'Payment verified and order confirmed' });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
