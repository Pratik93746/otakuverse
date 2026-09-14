import { NextRequest, NextResponse } from 'next/server';

const ACTIVE_COUPONS: Record<
  string,
  {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    maxDiscount?: number;
    minOrder?: number;
  }
> = {
  OTAKU10: { code: 'OTAKU10', type: 'PERCENTAGE', value: 10, maxDiscount: 1000, minOrder: 1500 },
  BANKAI20: { code: 'BANKAI20', type: 'PERCENTAGE', value: 20, maxDiscount: 2000, minOrder: 3000 },
  GOJO500: { code: 'GOJO500', type: 'FIXED', value: 500, minOrder: 4000 },
  WELCOME: { code: 'WELCOME', type: 'PERCENTAGE', value: 15, maxDiscount: 1500, minOrder: 2000 },
};

export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal = 0 } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const coupon = ACTIVE_COUPONS[cleanCode];

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 });
    }

    if (coupon.minOrder && orderTotal < coupon.minOrder) {
      return NextResponse.json(
        { error: `Minimum order amount ₹${coupon.minOrder} required for this coupon` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.round((orderTotal * coupon.value) / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value;
    }

    return NextResponse.json({ discount, couponId: coupon.code });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
