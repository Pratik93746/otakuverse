import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { updateFirestoreOrderPayment } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderNumber } =
      await request.json();

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    // Verify signature if Razorpay keys are configured
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    // Update Firestore order
    await updateFirestoreOrderPayment(orderNumber, {
      paymentStatus: 'PAID',
      paymentId: razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });

    // Dual-write update to Prisma if available
    try {
      await prisma.order.update({
        where: { orderNumber },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          razorpayPaymentId,
          razorpaySignature,
        },
      });
    } catch {
      // ignore prisma fallback error
    }

    return NextResponse.json({ success: true, message: 'Payment verified and order confirmed' });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
