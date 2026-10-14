import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { generateOrderNumber } from '@/lib/utils';
import { createOrder, getUserOrders, bindRazorpayOrder, markOrderAbandoned, countOpenCodOrders, hasUsedCoupon } from '@/lib/db/orders';
import { clearCart } from '@/lib/db/carts';
import { saveAddress } from '@/lib/db/addresses';
import { findUserByFirebaseUid, upsertUser } from '@/lib/db/users';
import { getPurchasableProduct, decrementProductStock, incrementProductStock } from '@/lib/db/products';
import { calculateCouponDiscount, ACTIVE_COUPONS } from '@/lib/coupons';
import { OrderItem } from '@/lib/db/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRazorpayClient, getRazorpayCredentials } from '@/lib/razorpay';

async function resolveUser(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  // 1. Try Firebase Bearer Token
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const fbUser = await requireFirebaseUser(request);
      if (fbUser?.uid) return { uid: fbUser.uid, email: fbUser.email };
    } catch {
      // fallback
    }
  }

  // 2. Try NextAuth session
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const uid = (session.user as any).firebaseUid || (session.user as any).id || '';
      return { uid, email: session.user.email || undefined };
    }
  } catch {
    // ignore
  }

  return null;
}

const MAX_LINES = 30;
const MAX_QTY_PER_LINE = 20;
/** Unfinished COD orders one account may hold at a time (limits fake-COD stock hoarding). */
const MAX_OPEN_COD_ORDERS = 3;

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { items, address, deliveryMethod, couponCode } = body;
    const paymentMethod = body.paymentMethod === 'cod' ? 'cod' : 'razorpay';

    // Checkout requires sign-in (the checkout page redirects to /login). Enforce it here
    // too, so anonymous scripts cannot create confirmed COD orders that hold stock.
    const user = await resolveUser(request);
    if (!user?.uid) {
      return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }
    if (items.length > MAX_LINES) {
      return NextResponse.json({ error: 'Too many items in one order' }, { status: 400 });
    }

    if (!address || typeof address !== 'object') {
      return NextResponse.json({ error: 'Complete delivery address is required' }, { status: 400 });
    }
    const addr = {
      name: text(address.name ?? address.fullName, 100),
      line1: text(address.line1 ?? address.addressLine1, 200),
      line2: text(address.line2 ?? address.addressLine2, 200),
      city: text(address.city, 100),
      state: text(address.state, 100),
      pincode: text(address.pincode ?? address.pinCode, 10).replace(/\D/g, ''),
      phone: text(address.phone, 20),
      country: text(address.country, 60) || 'India',
    };

    if (!addr.name || !addr.line1 || !addr.city) {
      return NextResponse.json({ error: 'Complete delivery address is required' }, { status: 400 });
    }
    if (!/^[1-9]\d{5}$/.test(addr.pincode)) {
      return NextResponse.json({ error: 'A valid 6-digit Indian postal PIN code is required' }, { status: 400 });
    }
    const orderPhone = (text(body.customerPhone, 20) || addr.phone).replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
    if (!/^[6-9]\d{9}$/.test(orderPhone)) {
      return NextResponse.json({ error: 'A valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 is required' }, { status: 400 });
    }
    if (addr.line1.length < 5) {
      return NextResponse.json({ error: 'Delivery street address must be at least 5 characters long' }, { status: 400 });
    }
    if (addr.city.length < 2) {
      return NextResponse.json({ error: 'Valid city name is required' }, { status: 400 });
    }

    // Merge duplicate lines so the stock check sees the true total per product.
    const wanted = new Map<string, number>();
    for (const item of items) {
      const ref = item?.productId ?? item?.slug;
      const quantity = Number(item?.quantity);
      if (typeof ref !== 'string' || !ref) {
        return NextResponse.json({ error: 'Invalid item in order' }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
        return NextResponse.json({ error: `Quantity must be a whole number between 1 and ${MAX_QTY_PER_LINE}` }, { status: 400 });
      }
      wanted.set(ref, (wanted.get(ref) || 0) + quantity);
    }

    // Ensure user profile in MongoDB
    let dbUser: any = await findUserByFirebaseUid(user.uid);
    if (!dbUser) {
      dbUser = await upsertUser(user.uid, {
        email: user.email || `${user.uid}@collector.baka.style`,
        name: text(body.customerName, 100) || 'Collector',
      });
    }

    const email = user.email || text(body.customerEmail, 200) || dbUser?.email || '';
    const name = text(body.customerName, 100) || addr.name || dbUser?.name || 'Valued Collector';

    // Price every line from the database. Nothing the browser says about price is used.
    let serverSubtotal = 0;
    const verifiedItems: OrderItem[] = [];
    const merged = new Map<string, { product: any; quantity: number }>();

    for (const [ref, quantity] of wanted) {
      const dbProduct = await getPurchasableProduct(ref);
      if (!dbProduct) {
        return NextResponse.json({ error: 'An item in your cart is no longer available in our store catalog.' }, { status: 400 });
      }
      const key = dbProduct._id?.toString() || dbProduct.slug;
      const prev = merged.get(key);
      merged.set(key, { product: dbProduct, quantity: (prev?.quantity || 0) + quantity });
    }

    for (const { product: dbProduct, quantity } of merged.values()) {
      if (!(dbProduct.stock >= quantity)) {
        return NextResponse.json(
          { error: `Insufficient stock for "${dbProduct.name}". Only ${Math.max(0, dbProduct.stock || 0)} left in stock.` },
          { status: 400 }
        );
      }
      const unitPrice = dbProduct.price;
      const itemSubtotal = unitPrice * quantity;
      serverSubtotal += itemSubtotal;
      verifiedItems.push({
        productId: dbProduct._id?.toString() || dbProduct.slug,
        name: dbProduct.name,
        slug: dbProduct.slug,
        image: dbProduct.image || (dbProduct.images && dbProduct.images[0]) || '',
        characterName: dbProduct.characterName || undefined,
        animeName: dbProduct.animeName || undefined,
        brandName: dbProduct.brandName || undefined,
        sku: dbProduct.slug || dbProduct._id?.toString(),
        purchasePrice: unitPrice,
        quantity,
        subtotal: itemSubtotal,
      });
    }

    // Server-side discount strictly from a valid coupon. An invalid code is an error,
    // not a silent full-price charge the customer did not expect.
    let validDiscount = 0;
    let appliedCoupon: string | null = null;
    if (couponCode !== undefined && couponCode !== null && couponCode !== '') {
      if (typeof couponCode !== 'string') {
        return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
      }
      const couponResult = calculateCouponDiscount(couponCode, serverSubtotal);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.reason || 'Invalid or expired coupon code' }, { status: 400 });
      }
      appliedCoupon = couponCode.toUpperCase().trim();
      if (ACTIVE_COUPONS[appliedCoupon]?.oncePerCustomer && (await hasUsedCoupon(user.uid, appliedCoupon))) {
        return NextResponse.json({ error: `Coupon ${appliedCoupon} can only be used once per customer` }, { status: 400 });
      }
      validDiscount = couponResult.discount;
    }

    // Free delivery and taxes included in price on all orders. Work in paise to avoid float drift.
    const shipping = 0;
    const tax = 0;
    const totalPaise = Math.round(serverSubtotal * 100) + shipping + tax - Math.round(validDiscount * 100);
    if (totalPaise < 100) {
      return NextResponse.json({ error: 'Order total is below the minimum payable amount' }, { status: 400 });
    }
    const serverTotal = totalPaise / 100;

    if (paymentMethod === 'cod') {
      const open = await countOpenCodOrders(user.uid);
      if (open >= MAX_OPEN_COD_ORDERS) {
        return NextResponse.json(
          { error: 'You already have several cash-on-delivery orders in progress. Please pay online or wait for them to be delivered.' },
          { status: 429 }
        );
      }
    }

    const { key_id: razorpayKeyId } = getRazorpayCredentials();
    const rzp = paymentMethod === 'razorpay' ? getRazorpayClient() : null;
    if (paymentMethod === 'razorpay' && !rzp) {
      return NextResponse.json({ error: 'Razorpay payment gateway is not configured. Please contact support.' }, { status: 500 });
    }

    // COD: take the stock now, atomically, all-or-nothing.
    if (paymentMethod === 'cod') {
      const taken: OrderItem[] = [];
      for (const item of verifiedItems) {
        if (await decrementProductStock(item.productId, item.quantity)) {
          taken.push(item);
        } else {
          for (const t of taken) await incrementProductStock(t.productId, t.quantity);
          return NextResponse.json({ error: `"${item.name}" just sold out. Please update your cart.` }, { status: 409 });
        }
      }
    }

    const orderNumber = generateOrderNumber();
    const shippingAddressSnapshot = {
      fullName: addr.name,
      phone: addr.phone || orderPhone,
      addressLine1: addr.line1,
      addressLine2: addr.line2,
      city: addr.city,
      state: addr.state,
      pinCode: addr.pincode,
      country: addr.country,
    };

    try {
      await saveAddress(user.uid, shippingAddressSnapshot);
    } catch (addrErr) {
      console.debug('Address save notice:', addrErr);
    }

    // Record the order before talking to the gateway, so a gateway order can never
    // exist without a matching order in our database.
    const now = new Date();
    const order = await createOrder({
      orderNumber,
      firebaseUid: user.uid,
      customer: { name, email, phone: orderPhone },
      shippingAddress: shippingAddressSnapshot,
      items: verifiedItems,
      subtotal: serverSubtotal,
      shipping,
      tax,
      discount: validDiscount,
      total: serverTotal,
      couponCode: appliedCoupon,
      deliveryMethod: deliveryMethod === 'express' ? 'express' : 'standard',
      orderStatus: paymentMethod === 'cod' ? 'CONFIRMED' : 'PENDING',
      statusHistory: [{ at: now, from: null, to: paymentMethod === 'cod' ? 'CONFIRMED' : 'PENDING', by: 'system:checkout' }],
      payment: {
        paymentStatus: 'PENDING',
        paymentId: null,
        razorpayOrderId: null,
        razorpaySignature: null,
        paymentMethod: paymentMethod === 'cod' ? 'COD' : 'RAZORPAY',
        amount: serverTotal,
        currency: 'INR',
        createdAt: now,
      },
    });

    let razorpayOrderId: string | null = null;
    if (rzp) {
      try {
        const rpOrder = await rzp.orders.create({
          amount: totalPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: { orderNumber, userId: user.uid },
        });
        razorpayOrderId = rpOrder.id;
        await bindRazorpayOrder(orderNumber, rpOrder.id);
      } catch (rpErr: any) {
        console.error('Razorpay order creation failed:', rpErr?.error?.description || rpErr?.message);
        await markOrderAbandoned(orderNumber, 'payment gateway unavailable');
        return NextResponse.json({ error: 'Could not start the payment. Please try again in a moment.' }, { status: 502 });
      }
    }

    try {
      await clearCart(user.uid);
    } catch (cartErr) {
      console.debug('Clear cart notice:', cartErr);
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      orderId: order._id?.toString() || order.orderNumber,
      razorpayOrderId,
      razorpayKeyId,
      total: serverTotal,
    });
  } catch (err) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request);
    if (!user?.uid) {
      return NextResponse.json({ orders: [] });
    }
    const orders = await getUserOrders(user.uid);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o._id?.toString() || o.orderNumber,
        orderNumber: o.orderNumber,
        userId: o.firebaseUid,
        firebaseUid: o.firebaseUid,
        status: o.orderStatus,
        paymentStatus: o.payment.paymentStatus,
        paymentMethod: o.payment.paymentMethod,
        subtotal: o.subtotal,
        shipping: o.shipping,
        tax: o.tax,
        discount: o.discount,
        total: o.total,
        createdAt: o.createdAt?.toISOString(),
        items: o.items.map((i, idx) => ({
          id: `${o.orderNumber}-item-${idx}`,
          name: i.name,
          image: i.image,
          price: i.purchasePrice,
          quantity: i.quantity,
          total: i.subtotal,
        })),
        address: {
          name: o.shippingAddress.fullName,
          phone: o.shippingAddress.phone,
          line1: o.shippingAddress.addressLine1,
          line2: o.shippingAddress.addressLine2,
          city: o.shippingAddress.city,
          state: o.shippingAddress.state,
          pincode: o.shippingAddress.pinCode,
        },
      })),
    });
  } catch (err) {
    console.error('Order list error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
