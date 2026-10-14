import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { updateOrderPayment, getOrderByNumber, getOrderByRazorpayOrderId, claimAndMarkOrderPaid } from '@/lib/db/orders';
import { decrementProductStock } from '@/lib/db/products';

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

    // Retrieve order strictly by the authenticated gateway order ID (SEC-CRIT-03)
    const order = await getOrderByRazorpayOrderId(order_id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'No order found matching the verified payment gateway transaction.' },
        { status: 404 }
      );
    }

    // If orderNumber is provided, strictly enforce correspondence (prevents order substitution)
    if (orderNumber && order.orderNumber !== orderNumber) {
      console.error(`🚨 [Security Exception] Order substitution attempt: payload=${orderNumber}, bound=${order.orderNumber}`);
      return NextResponse.json(
        { success: false, error: 'Security violation: Order correspondence mismatch.' },
        { status: 400 }
      );
    }

    // Atomic Compare-And-Swap (CAS) to eliminate double-decrement race conditions (SEC-HIGH-02)
    const claimed = await claimAndMarkOrderPaid(order.orderNumber, {
      paymentId: payment_id,
      razorpayOrderId: order_id,
      razorpaySignature: signature,
    });

    if (claimed) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const prodId = item.productId || item.slug;
          if (prodId) {
            try {
              await decrementProductStock(prodId, item.quantity);
            } catch (stkErr) {
              console.warn(`Could not decrement stock for item ${prodId}:`, stkErr);
            }
          }
        }
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
