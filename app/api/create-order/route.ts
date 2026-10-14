import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayClient } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 404 });
  }

  try {
    const rzp = getRazorpayClient();
    if (!rzp) {
      return NextResponse.json(
        { error: 'Razorpay credentials not configured or authentication failed' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { amount, currency = 'INR', receipt, notes } = body;

    // Validate amount in paise (minimum 100 paise = 1 INR)
    if (typeof amount !== 'number' || isNaN(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise (₹1)' },
        { status: 400 }
      );
    }

    // Create order on Razorpay
    const rpOrder = await rzp.orders.create({
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return NextResponse.json(
      {
        order_id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Razorpay create-order error:', error);
    const isAuthError =
      error?.statusCode === 401 ||
      error?.status === 401 ||
      error?.message?.toLowerCase().includes('auth') ||
      error?.error?.code === 'BAD_REQUEST_ERROR' && error?.error?.description?.toLowerCase().includes('key');
    const statusCode = isAuthError ? 401 : (error?.statusCode || 500);
    const message = error?.error?.description || error?.message || 'Failed to create Razorpay order';
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
