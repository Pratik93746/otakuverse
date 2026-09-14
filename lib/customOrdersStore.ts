import fs from 'fs';
import path from 'path';

export interface StoredOrderItem {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  quantity: number;
  price?: number;
  characterName?: string;
  animeName?: string;
  categoryName?: string;
}

export interface StoredOrderAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country?: string;
}

export interface StoredOrder {
  id: string;
  orderNumber: string;
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    uid?: string;
  };
  shippingAddress: StoredOrderAddress;
  items: StoredOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  deliveryMethod?: string;
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment: {
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    paymentMethod: 'COD' | 'RAZORPAY' | 'CARDS' | 'UPI';
    paymentId?: string | null;
    razorpayOrderId?: string | null;
    razorpaySignature?: string | null;
    amount: number;
    currency: string;
    createdAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// In Next.js with cwd at root or otakuverse, find path safely
function getStorageFile() {
  const possiblePaths = [
    path.join(process.cwd(), 'lib', 'custom-orders.json'),
    path.join(process.cwd(), 'otakuverse', 'lib', 'custom-orders.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

function ensureFileExists(filepath: string) {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('⚠️ [customOrdersStore] Could not initialize storage file:', err);
  }
}

export function getStoredOrders(): StoredOrder[] {
  try {
    const filepath = getStorageFile();
    ensureFileExists(filepath);
    if (!fs.existsSync(filepath)) return [];
    const content = fs.readFileSync(filepath, 'utf-8');
    const parsed = JSON.parse(content || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('⚠️ [customOrdersStore] Error reading orders:', err);
    return [];
  }
}

export function getStoredOrder(idOrNumber: string): StoredOrder | null {
  const orders = getStoredOrders();
  const found = orders.find(
    (o) => o.orderNumber === idOrNumber || o.id === idOrNumber
  );
  return found || null;
}

export function saveStoredOrder(order: any): StoredOrder {
  try {
    const filepath = getStorageFile();
    ensureFileExists(filepath);
    const orders = getStoredOrders();
    const now = new Date().toISOString();

    const orderNum = String(order.orderNumber || order.id || `OTV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

    const normalizedOrder: StoredOrder = {
      id: order.id || orderNum,
      orderNumber: orderNum,
      userId: order.userId || '',
      customer: {
        name: order.customer?.name || order.shippingAddress?.fullName || order.customerName || 'Customer',
        email: order.customer?.email || order.customerEmail || '',
        phone: order.customer?.phone || order.shippingAddress?.phone || order.customerPhone || '',
        uid: order.customer?.uid || order.userId || '',
      },
      shippingAddress: {
        fullName: order.shippingAddress?.fullName || order.customer?.name || 'Customer',
        phone: order.shippingAddress?.phone || order.customer?.phone || '',
        addressLine1: order.shippingAddress?.addressLine1 || order.addressLine1 || '',
        addressLine2: order.shippingAddress?.addressLine2 || order.addressLine2 || '',
        city: order.shippingAddress?.city || order.city || '',
        state: order.shippingAddress?.state || order.state || '',
        pinCode: order.shippingAddress?.pinCode || order.pincode || '',
        country: order.shippingAddress?.country || 'India',
      },
      items: (order.items || []).map((it: any) => ({
        productId: it.productId || it.id || '',
        name: it.name || 'Anime Figure',
        slug: it.slug || '',
        image: it.image || '',
        quantity: Number(it.quantity) || 1,
        price: Number(it.purchasePrice || it.price) || 0,
        characterName: it.characterName || '',
        animeName: it.animeName || '',
        categoryName: it.categoryName || '',
      })),
      subtotal: Number(order.subtotal) || 0,
      shipping: Number(order.shipping) || 0,
      tax: Number(order.tax) || 0,
      discount: Number(order.discount) || 0,
      total: Number(order.total) || 0,
      couponCode: order.couponCode || null,
      deliveryMethod: order.deliveryMethod || 'standard',
      orderStatus: (order.orderStatus as any) || 'CONFIRMED',
      payment: {
        paymentStatus: (order.payment?.paymentStatus as any) || (order.paymentMethod === 'cod' ? 'PENDING' : 'PENDING'),
        paymentMethod: (order.payment?.paymentMethod?.toUpperCase() as any) || (order.paymentMethod?.toUpperCase() as any) || 'COD',
        paymentId: order.payment?.paymentId || null,
        razorpayOrderId: order.payment?.razorpayOrderId || null,
        razorpaySignature: order.payment?.razorpaySignature || null,
        amount: Number(order.payment?.amount || order.total) || 0,
        currency: order.payment?.currency || 'INR',
        createdAt: order.payment?.createdAt || now,
      },
      createdAt: order.createdAt || now,
      updatedAt: now,
    };

    const idx = orders.findIndex((o) => o.orderNumber === normalizedOrder.orderNumber);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...normalizedOrder, updatedAt: now };
    } else {
      orders.unshift(normalizedOrder);
    }

    fs.writeFileSync(filepath, JSON.stringify(orders, null, 2), 'utf-8');
    return normalizedOrder;
  } catch (err) {
    console.error('⚠️ [customOrdersStore] Error saving order:', err);
    throw err;
  }
}

export function updateStoredOrderStatus(orderNumber: string, status: string): boolean {
  try {
    const filepath = getStorageFile();
    ensureFileExists(filepath);
    const orders = getStoredOrders();
    const idx = orders.findIndex((o) => o.orderNumber === orderNumber || o.id === orderNumber);
    if (idx < 0) return false;

    orders[idx].orderStatus = status as any;
    orders[idx].updatedAt = new Date().toISOString();

    fs.writeFileSync(filepath, JSON.stringify(orders, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('⚠️ [customOrdersStore] Error updating order status:', err);
    return false;
  }
}

export function updateStoredOrderPayment(
  orderNumber: string,
  paymentData: {
    paymentStatus: string;
    paymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }
): boolean {
  try {
    const filepath = getStorageFile();
    ensureFileExists(filepath);
    const orders = getStoredOrders();
    const idx = orders.findIndex((o) => o.orderNumber === orderNumber || o.id === orderNumber);
    if (idx < 0) return false;

    orders[idx].payment.paymentStatus = paymentData.paymentStatus as any;
    if (paymentData.paymentId) orders[idx].payment.paymentId = paymentData.paymentId;
    if (paymentData.razorpayOrderId) orders[idx].payment.razorpayOrderId = paymentData.razorpayOrderId;
    if (paymentData.razorpaySignature) orders[idx].payment.razorpaySignature = paymentData.razorpaySignature;

    if (paymentData.paymentStatus === 'PAID') {
      orders[idx].orderStatus = 'CONFIRMED';
    }

    orders[idx].updatedAt = new Date().toISOString();
    fs.writeFileSync(filepath, JSON.stringify(orders, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('⚠️ [customOrdersStore] Error updating order payment:', err);
    return false;
  }
}
