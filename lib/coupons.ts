export interface CouponDefinition {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxDiscount?: number;
  minOrder?: number;
  /** One use per customer (welcome / first-order offers). Enforced at order creation. */
  oncePerCustomer?: boolean;
  /** Optional expiration timestamp. */
  expiresAt?: Date | string;
}

export const ACTIVE_COUPONS: Record<string, CouponDefinition> = {
  OTAKU10: { code: 'OTAKU10', type: 'PERCENTAGE', value: 10, maxDiscount: 1000, minOrder: 1500 },
  BANKAI20: { code: 'BANKAI20', type: 'PERCENTAGE', value: 20, maxDiscount: 2000, minOrder: 3000 },
  GOJO500: { code: 'GOJO500', type: 'FIXED', value: 500, minOrder: 4000 },
  WELCOME: { code: 'WELCOME', type: 'PERCENTAGE', value: 15, maxDiscount: 1500, minOrder: 2000, oncePerCustomer: true },
  POSTER15: { code: 'POSTER15', type: 'PERCENTAGE', value: 15, maxDiscount: 1000, minOrder: 999 },
  FIRSTWALL: { code: 'FIRSTWALL', type: 'FIXED', value: 200, minOrder: 1200, oncePerCustomer: true },
};

/**
 * Server-side zero-trust coupon validation and discount calculator
 */
export function calculateCouponDiscount(code: string | undefined | null, orderTotal: number): { valid: boolean; discount: number; reason?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, discount: 0 };
  }
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return { valid: false, discount: 0, reason: 'Invalid order total' };
  }

  const clean = code.toUpperCase().trim();
  const coupon = ACTIVE_COUPONS[clean];

  if (!coupon) {
    return { valid: false, discount: 0, reason: 'Invalid or expired coupon code' };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, discount: 0, reason: `Coupon ${clean} has expired` };
  }

  if (coupon.minOrder && orderTotal < coupon.minOrder) {
    return {
      valid: false,
      discount: 0,
      reason: `Minimum order amount of ₹${coupon.minOrder} required for coupon ${clean}`,
    };
  }

  let discount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discount = Math.round((orderTotal * coupon.value) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.value;
  }

  discount = Math.min(Math.max(0, discount), orderTotal);
  return { valid: true, discount };
}
