import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, handleAuthError } from '@/lib/firebase-admin';
import { generateOrderNumber } from '@/lib/utils';
import { createOrder, getUserOrders } from '@/lib/db/orders';
import { clearCart } from '@/lib/db/carts';
import { saveAddress } from '@/lib/db/addresses';
import { findUserByFirebaseUid, upsertUser } from '@/lib/db/users';
import { getProductByIdOrSlug } from '@/lib/db/products';
import { OrderItem } from '@/lib/db/types';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

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
      const uid = (session.user as any).firebaseUid || (session.user as any).id || session.user.email || '';
      return { uid, email: session.user.email || undefined };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      items,
      address,
      customerName,
      customerEmail,
      customerPhone,
      deliveryMethod,
      paymentMethod,
      couponCode,
      discount = 0,
    } = body;

    const user = await resolveUser(request);
    const orderUid = user?.uid || (customerEmail ? `cust_${customerEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : `guest_${Date.now()}`);

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    if (!address || !address.name || !address.line1 || !address.city) {
      return NextResponse.json({ error: 'Complete delivery address is required' }, { status: 400 });
    }

    const pin = (address.pincode || address.pinCode || '').trim().replace(/\D/g, '');
    if (!/^[1-9]\d{5}$/.test(pin)) {
      return NextResponse.json({ error: 'A valid 6-digit Indian postal PIN code is required' }, { status: 400 });
    }

    const orderPhone = (customerPhone || address.phone || '').trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(orderPhone)) {
      return NextResponse.json({ error: 'A valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 is required' }, { status: 400 });
    }

    if (address.line1.trim().length < 5) {
      return NextResponse.json({ error: 'Delivery street address must be at least 5 characters long' }, { status: 400 });
    }

    if (address.city.trim().length < 2) {
      return NextResponse.json({ error: 'Valid city name is required' }, { status: 400 });
    }

    // Ensure user profile in MongoDB if authenticated
    let dbUser: any = null;
    if (user?.uid) {
      dbUser = await findUserByFirebaseUid(user.uid);
      if (!dbUser) {
        dbUser = await upsertUser(user.uid, {
          email: user.email || customerEmail || `${user.uid}@collector.baka.style`,
          name: customerName || 'Collector',
        });
      }
    }

    const email = customerEmail || dbUser?.email || user?.email || 'collector@baka.style';
    const name = customerName || address.name || dbUser?.name || 'Valued Collector';
    const phone = customerPhone || address.phone || dbUser?.phone || '';

    // Calculate subtotal server-side by looking up verified products in MongoDB
    let serverSubtotal = 0;
    const verifiedItems: OrderItem[] = [];

    for (const item of items) {
      const dbProduct = await getProductByIdOrSlug(item.productId || item.slug || item.name);

      let unitPrice = Number(item.price) || 0;
      let productName = item.name || 'Anime Collectible';
      let productImage = item.image || '';
      let productSlug = item.slug || '';
      let characterName = '';
      let animeName = '';
      let brandName = '';
      let sku = item.productId || '';

      if (dbProduct) {
        // ALWAYS enforce server/database price
        unitPrice = dbProduct.price;
        productName = dbProduct.name;
        productImage = dbProduct.image || productImage;
        productSlug = dbProduct.slug;
        characterName = dbProduct.characterName || '';
        animeName = dbProduct.animeName || '';
        brandName = dbProduct.brandName || '';
        sku = dbProduct.slug || dbProduct._id?.toString() || sku;
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemSubtotal = unitPrice * quantity;
      serverSubtotal += itemSubtotal;

      verifiedItems.push({
        productId: item.productId || productSlug,
        name: productName,
        slug: productSlug,
        image: productImage,
        characterName: characterName || undefined,
        animeName: animeName || undefined,
        brandName: brandName || undefined,
        sku: sku || undefined,
        purchasePrice: unitPrice,
        quantity,
        subtotal: itemSubtotal,
      });
    }

    // Calculate delivery, tax, discount & total server-side
    const shipping = deliveryMethod === 'express' ? 149 : serverSubtotal > 999 ? 0 : 79;
    const tax = Math.round(serverSubtotal * 0.18);
    const validDiscount = Math.min(Math.max(0, Number(discount) || 0), serverSubtotal);
    const serverTotal = serverSubtotal + shipping + tax - validDiscount;

    const orderNumber = generateOrderNumber();

    // Create Razorpay order if online payment
    let razorpayOrderId: string | null = null;
    if (paymentMethod !== 'cod' && razorpay) {
      try {
        const rpOrder = await razorpay.orders.create({
          amount: Math.round(serverTotal * 100),
          currency: 'INR',
          receipt: orderNumber,
        });
        razorpayOrderId = rpOrder.id;
      } catch (rpErr) {
        console.warn('⚠️ Razorpay order creation skipped/failed:', rpErr);
      }
    }

    const shippingAddressSnapshot = {
      fullName: address.name || address.fullName,
      phone: address.phone,
      addressLine1: address.line1 || address.addressLine1,
      addressLine2: address.line2 || address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pinCode: address.pincode || address.pinCode,
      country: address.country || 'India',
    };

    // Save address to user's saved addresses in MongoDB
    if (user?.uid) {
      try {
        await saveAddress(user.uid, shippingAddressSnapshot);
      } catch (addrErr) {
        console.debug('Address save notice:', addrErr);
      }
    }

    const now = new Date();
    const order = await createOrder({
      orderNumber,
      firebaseUid: orderUid,
      customer: {
        name,
        email,
        phone,
      },
      shippingAddress: shippingAddressSnapshot,
      items: verifiedItems,
      subtotal: serverSubtotal,
      shipping,
      tax,
      discount: validDiscount,
      total: serverTotal,
      couponCode: couponCode || null,
      deliveryMethod: deliveryMethod || 'standard',
      orderStatus: paymentMethod === 'cod' ? 'CONFIRMED' : 'PENDING',
      payment: {
        paymentStatus: 'PENDING',
        paymentId: null,
        razorpayOrderId: razorpayOrderId || null,
        razorpaySignature: null,
        paymentMethod: paymentMethod === 'cod' ? 'COD' : 'RAZORPAY',
        amount: serverTotal,
        currency: 'INR',
        createdAt: now,
      },
    });

    // Clear MongoDB cart for this user
    if (user?.uid) {
      try {
        await clearCart(user.uid);
      } catch (cartErr) {
        console.debug('Clear cart notice:', cartErr);
      }
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      orderId: order._id?.toString() || order.orderNumber,
      razorpayOrderId,
      total: serverTotal,
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to place order' }, { status: 500 });
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch orders' }, { status: 500 });
  }
}
