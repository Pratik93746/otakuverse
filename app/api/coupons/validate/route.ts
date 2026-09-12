import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal } = await request.json();

    if (!code) return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    if (coupon.minOrder && orderTotal < coupon.minOrder) {
      return NextResponse.json({
        error: `Minimum order amount ₹${coupon.minOrder} required for this coupon`,
      }, { status: 400 });
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.round((orderTotal * coupon.value) / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value;
    }

    return NextResponse.json({ discount, couponId: coupon.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
