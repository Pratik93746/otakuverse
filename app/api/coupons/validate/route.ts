import { NextRequest, NextResponse } from 'next/server';
import { calculateCouponDiscount } from '@/lib/coupons';

export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal = 0 } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
    }

    const result = calculateCouponDiscount(code, Number(orderTotal) || 0);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.reason || 'Invalid or expired coupon code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      discount: result.discount,
      couponId: String(code).toUpperCase().trim(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
