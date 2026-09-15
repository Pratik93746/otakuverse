import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { updateOrderPayment } from '@/lib/db/orders';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Support both standard Razorpay naming and camelCase/underscore naming
    const order_id = body.order_id || body.razorpay_order_id;
    const payment_id = body.payment_id || body.razorpay_payment_id;
    const signature = body.razorpay_signature || body.signature;
    const orderNumber = body.orderNumber;

    // Validate presence of required verification fields
    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        {
          error: 'Missing required fields: order_id, payment_id, and razorpay_signature are required',
        },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifyPaymentSignature({
      orderId: order_id,
      paymentId: payment_id,
      signature: signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Signature verification failed: Invalid signature' },
        { status: 400 }
      );
    }

    // If linked to an order in MongoDB, update the order payment status to PAID
    if (orderNumber) {
      try {
        await updateOrderPayment(orderNumber, {
          paymentStatus: 'PAID',
          paymentId: payment_id,
          razorpayOrderId: order_id,
          razorpaySignature: signature,
        });
      } catch (dbErr) {
        console.warn('Failed to update DB order during payment verification:', dbErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment signature verified successfully',
        payment_id,
        order_id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error during payment verification' },
      { status: 500 }
    );
  }
}
