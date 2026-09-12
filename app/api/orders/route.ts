import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/utils';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import {
  createFirestoreOrder,
  getUserFirestoreOrders,
  clearFirestoreCart,
  saveFirestoreAddress,
  FirestoreOrderItem,
} from '@/lib/firestore';
import Razorpay from 'razorpay';

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    if (!address || !address.name || !address.line1 || !address.city || !address.pincode) {
      return NextResponse.json({ error: 'Valid delivery address is required' }, { status: 400 });
    }

    const userId = session?.user?.id || 'guest-' + Date.now();
    const email = customerEmail || session?.user?.email || 'customer@otakuverse.com';
    const name = customerName || address.name || session?.user?.name || 'Valued Collector';
    const phone = customerPhone || address.phone || '';

    // Calculate subtotal server-side by verifying product catalog
    let serverSubtotal = 0;
    const verifiedItems: FirestoreOrderItem[] = [];

    for (const item of items) {
      // Look up product in mock catalog first
      const mockProduct = MOCK_PRODUCTS.find(
        (p) =>
          p.id === item.productId ||
          p.slug === item.productId ||
          (item.slug && p.slug === item.slug) ||
          (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
      );

      let unitPrice = item.price;
      let productName = item.name || mockProduct?.name || 'Anime Collectible';
      let productImage = item.image || mockProduct?.image || '';
      let productSlug = item.slug || mockProduct?.slug || '';
      let characterName = mockProduct?.characterName || '';
      let animeName = mockProduct?.animeName || '';
      let brandName = mockProduct?.brandName || '';
      let sku = mockProduct?.id || item.productId;

      if (mockProduct) {
        unitPrice = mockProduct.price;
        productName = mockProduct.name;
        productImage = mockProduct.image || item.image || '';
        productSlug = mockProduct.slug;
        characterName = mockProduct.characterName || '';
        animeName = mockProduct.animeName || '';
        brandName = mockProduct.brandName || '';
      } else {
        try {
          const dbProduct = await prisma.product.findUnique({
            where: { id: item.productId },
            include: {
              images: { where: { isMain: true }, take: 1 },
              character: true,
              anime: true,
              brand: true,
            },
          });
          if (dbProduct) {
            unitPrice = dbProduct.price;
            productName = dbProduct.name;
            productImage = dbProduct.images?.[0]?.url || productImage;
            productSlug = dbProduct.slug;
            characterName = dbProduct.character?.name || characterName;
            animeName = dbProduct.anime?.name || animeName;
            brandName = dbProduct.brand?.name || brandName;
            sku = dbProduct.sku || sku;
          }
        } catch {
          // Keep fallback
        }
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemSubtotal = unitPrice * quantity;
      serverSubtotal += itemSubtotal;

      verifiedItems.push({
        productId: item.productId,
        name: productName,
        slug: productSlug,
        image: productImage,
        characterName: characterName || undefined,
        animeName: animeName || undefined,
        brandName: brandName || undefined,
        sku: sku || undefined,
        purchasePrice: unitPrice, // Historical immutable purchase price
        quantity,
        subtotal: itemSubtotal,
      });
    }

    // Calculate delivery, tax, discount & total
    const shipping = deliveryMethod === 'express' ? 149 : serverSubtotal > 999 ? 0 : 79;
    const tax = Math.round(serverSubtotal * 0.18);
    const validDiscount = Math.min(discount, serverSubtotal);
    const serverTotal = serverSubtotal + shipping + tax - validDiscount;

    // Generate permanent Order Number
    const orderNumber = generateOrderNumber();

    // Create Razorpay order if online payment
    let razorpayOrderId: string | undefined;
    if (paymentMethod !== 'cod' && razorpay) {
      try {
        const rpOrder = await razorpay.orders.create({
          amount: Math.round(serverTotal * 100),
          currency: 'INR',
          receipt: orderNumber,
        });
        razorpayOrderId = rpOrder.id;
      } catch (rpErr) {
        console.warn('Razorpay order creation skipped/failed:', rpErr);
      }
    }

    // Immutable Shipping Address Snapshot
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

    // Save address to user's saved addresses in Firestore
    if (session?.user?.id) {
      try {
        await saveFirestoreAddress(session.user.id, shippingAddressSnapshot);
      } catch (addrErr) {
        console.debug('Address save notice:', addrErr);
      }
    }

    // Create permanent order in Firestore
    const firestoreOrder = await createFirestoreOrder({
      id: orderNumber,
      orderNumber,
      userId,
      customer: {
        name,
        email,
        phone,
        uid: userId,
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
        paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'PENDING',
        paymentId: null,
        razorpayOrderId: razorpayOrderId || null,
        paymentMethod: paymentMethod === 'cod' ? 'COD' : 'RAZORPAY',
        amount: serverTotal,
        currency: 'INR',
        createdAt: new Date().toISOString(),
      },
    });

    // Clear user's Firestore cart upon placing order
    if (session?.user?.id) {
      await clearFirestoreCart(session.user.id);
    }

    // Dual-write to Prisma if database is connected
    try {
      let addressId: string | undefined;
      if (session?.user?.id) {
        const addr = await prisma.address.create({
          data: {
            userId: session.user.id,
            name: shippingAddressSnapshot.fullName,
            phone: shippingAddressSnapshot.phone,
            line1: shippingAddressSnapshot.addressLine1,
            line2: shippingAddressSnapshot.addressLine2 || null,
            city: shippingAddressSnapshot.city,
            state: shippingAddressSnapshot.state,
            pincode: shippingAddressSnapshot.pinCode,
            country: shippingAddressSnapshot.country,
          },
        });
        addressId = addr.id;
      }

      await prisma.order.create({
        data: {
          orderNumber,
          userId: session?.user?.id,
          addressId,
          status: paymentMethod === 'cod' ? 'CONFIRMED' : 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: paymentMethod === 'cod' ? 'COD' : 'RAZORPAY',
          subtotal: serverSubtotal,
          discount: validDiscount,
          shipping,
          tax,
          total: serverTotal,
          couponCode: couponCode || null,
          razorpayOrderId,
          items: {
            create: verifiedItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              image: item.image || null,
              price: item.purchasePrice,
              quantity: item.quantity,
              total: item.subtotal,
            })),
          },
        },
      });
    } catch {
      // Prisma fallback ignored if DB server is offline
    }

    return NextResponse.json({
      orderNumber: firestoreOrder.orderNumber,
      orderId: firestoreOrder.id,
      razorpayOrderId,
      total: serverTotal,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const email = session?.user?.email || undefined;

    if (!userId && !email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query Firestore for user's orders
    const firestoreOrders = await getUserFirestoreOrders(userId || '', email);

    if (firestoreOrders.length > 0) {
      return NextResponse.json({
        orders: firestoreOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          userId: o.userId,
          status: o.orderStatus,
          paymentStatus: o.payment.paymentStatus,
          paymentMethod: o.payment.paymentMethod,
          subtotal: o.subtotal,
          shipping: o.shipping,
          tax: o.tax,
          discount: o.discount,
          total: o.total,
          createdAt: o.createdAt,
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
    }

    // Prisma Fallback
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: true,
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ orders });
    } catch {
      return NextResponse.json({ orders: [] });
    }
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
