import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================================
// DATA MODELS & INTERFACES
// ============================================================

export interface FirestoreUserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreCartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface FirestoreCart {
  userId: string;
  userEmail: string;
  userName: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  items: FirestoreCartItem[];
  subtotal: number;
  totalItems: number;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface FirestoreOrderItem {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  characterName?: string;
  animeName?: string;
  brandName?: string;
  sku?: string;
  purchasePrice: number;
  quantity: number;
  subtotal: number;
}

export interface FirestoreOrder {
  id: string;
  orderNumber: string;
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    uid?: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  items: FirestoreOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  deliveryMethod: string;
  orderStatus: OrderStatus;
  payment: {
    paymentStatus: PaymentStatus;
    paymentId?: string | null;
    razorpayOrderId?: string | null;
    razorpaySignature?: string | null;
    paymentMethod: string;
    amount: number;
    currency: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// USER PROFILES
// ============================================================

export async function saveFirestoreUserProfile(profile: {
  uid: string;
  name?: string;
  email: string;
  phone?: string;
  role?: 'USER' | 'ADMIN';
}) {
  if (!db || !profile.uid) return null;
  try {
    const userRef = doc(db, 'users', profile.uid);
    let existingData: any = null;
    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        existingData = existingSnap.data();
      }
    } catch {
      // continue without existing data
    }

    const now = new Date().toISOString();
    const isAdmin =
      profile.email.toLowerCase() === 'gojo@otakuverse.com' ||
      profile.email.toLowerCase() === 'admin@otakuverse.in';

    const data: FirestoreUserProfile = {
      uid: profile.uid,
      name: profile.name || profile.email.split('@')[0],
      email: profile.email,
      phone: profile.phone || '',
      role: isAdmin ? 'ADMIN' : (profile.role || 'USER'),
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
    };

    await setDoc(userRef, data, { merge: true });
    return data;
  } catch (err: any) {
    console.warn('⚠️ [Firestore] User profile save notice:', err?.message || err);
    return null;
  }
}

export async function getFirestoreUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  if (!db || !uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as FirestoreUserProfile;
    }
  } catch (err: any) {
    console.warn('⚠️ [Firestore] User profile fetch notice:', err?.message || err);
  }
  return null;
}

export async function getAllFirestoreUsers(): Promise<FirestoreUserProfile[]> {
  if (!db) return [];
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreUserProfile);
  } catch {
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map((d) => d.data() as FirestoreUserProfile);
    } catch {
      return [];
    }
  }
}

// ============================================================
// DELIVERY ADDRESSES
// ============================================================

export async function getFirestoreAddresses(userId: string): Promise<FirestoreAddress[]> {
  if (!db || !userId) return [];
  try {
    const addressesRef = collection(db, 'addresses');
    const q = query(addressesRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FirestoreAddress[];
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Addresses fetch notice:', err?.message || err);
    return [];
  }
}

export async function saveFirestoreAddress(
  userId: string,
  address: Omit<FirestoreAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  addressId?: string
): Promise<FirestoreAddress> {
  if (!db) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const id = addressId || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const addrRef = doc(db, 'addresses', id);

  const data: FirestoreAddress = {
    ...address,
    id,
    userId,
    country: address.country || 'India',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(addrRef, data, { merge: true });
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Address save notice:', err?.message || err);
  }
  return data;
}

export async function deleteFirestoreAddress(addressId: string, userId: string): Promise<boolean> {
  if (!db || !addressId) return false;
  try {
    const addrRef = doc(db, 'addresses', addressId);
    const snap = await getDoc(addrRef);
    if (snap.exists() && snap.data()?.userId === userId) {
      await deleteDoc(addrRef);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================
// CART PERSISTENCE & SYNCHRONIZATION
// ============================================================

export async function getFirestoreCart(userId: string): Promise<FirestoreCart | null> {
  if (!db || !userId) return null;
  try {
    const cartRef = doc(db, 'carts', userId);
    const snap = await getDoc(cartRef);
    if (snap.exists()) {
      const data = snap.data() as FirestoreCart;
      // Fetch from subcollection carts/{userId}/items
      try {
        const itemsSnap = await getDocs(collection(db, 'carts', userId, 'items'));
        if (!itemsSnap.empty) {
          data.items = itemsSnap.docs.map((d) => {
            const itemData = d.data();
            return {
              productId: d.id,
              name: itemData.productName || itemData.name || '',
              slug: itemData.slug || '',
              image: itemData.image || '',
              price: Number(itemData.price) || 0,
              quantity: Number(itemData.quantity) || 1,
              stock: Number(itemData.stock) || 10,
            };
          });
        } else if (!data.items) {
          data.items = [];
        }
      } catch (subErr) {
        console.warn('⚠️ [Firestore] Cart subcollection fetch notice:', subErr);
        if (!data.items) data.items = [];
      }
      return data;
    }
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Cart fetch notice:', err?.message || err);
  }
  return null;
}

export async function syncCartToFirestore(
  userId: string,
  userEmail: string,
  userName: string,
  items: FirestoreCartItem[],
  customer?: { id?: string; email?: string; name?: string }
): Promise<void> {
  if (!db || !userId) {
    console.warn('⚠️ [Firestore] Cannot sync cart: db or userId is missing', { db: !!db, userId });
    return;
  }
  try {
    const now = new Date().toISOString();
    const cartRef = doc(db, 'carts', userId);
    const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const totalItems = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

    const data: any = {
      userId,
      userEmail: userEmail || '',
      userName: userName || userEmail.split('@')[0] || 'Collector',
      subtotal,
      totalItems,
      updatedAt: now,
    };
    if (customer?.id) data.customerId = customer.id;
    if (customer?.email) data.customerEmail = customer.email;
    if (customer?.name) data.customerName = customer.name;

    // 1. Write main cart document
    await setDoc(cartRef, data, { merge: true });

    // 2. Write individual items to subcollection carts/{userId}/items/{productId}
    const currentProductIds = new Set(items.map((i) => i.productId));
    for (const item of items) {
      const itemRef = doc(db, 'carts', userId, 'items', item.productId);
      const itemData = {
        productId: item.productId,
        productName: item.name || '',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        image: item.image || '',
        slug: item.slug || '',
        stock: Number(item.stock) || 10,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(itemRef, itemData, { merge: true });
    }

    // 3. Clean up any removed items from subcollection
    try {
      const existingItemsSnap = await getDocs(collection(db, 'carts', userId, 'items'));
      for (const d of existingItemsSnap.docs) {
        if (!currentProductIds.has(d.id)) {
          await deleteDoc(doc(db, 'carts', userId, 'items', d.id));
        }
      }
    } catch {
      // ignore subcollection cleanup error
    }

    console.log('🔥 [Firestore] Successfully saved cart to Firestore:', {
      userId,
      path: `carts/${userId}`,
      itemsCount: items.length,
      totalItems,
      subtotal,
    });
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Cart sync notice:', err?.message || err);
  }
}

export async function clearFirestoreCart(userId: string): Promise<void> {
  if (!db || !userId) return;
  try {
    const cartRef = doc(db, 'carts', userId);
    await setDoc(
      cartRef,
      {
        subtotal: 0,
        totalItems: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Delete subcollection items
    try {
      const existingItemsSnap = await getDocs(collection(db, 'carts', userId, 'items'));
      for (const d of existingItemsSnap.docs) {
        await deleteDoc(doc(db, 'carts', userId, 'items', d.id));
      }
    } catch {
      // ignore
    }

    console.log('🔥 [Firestore] Cleared cart for user:', userId);
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Failed to clear cart in Firestore:', err?.message || err);
  }
}

export async function getAllFirestoreCarts(): Promise<FirestoreCart[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'carts'));
    const carts: FirestoreCart[] = [];

    for (const d of snap.docs) {
      const data = d.data() as FirestoreCart;
      let cartItems = data.items || [];

      if (cartItems.length === 0) {
        try {
          const itemsSnap = await getDocs(collection(db, 'carts', d.id, 'items'));
          cartItems = itemsSnap.docs.map((itemDoc) => {
            const idata = itemDoc.data();
            return {
              productId: itemDoc.id,
              name: idata.productName || idata.name || '',
              slug: idata.slug || '',
              image: idata.image || '',
              price: idata.price || 0,
              quantity: idata.quantity || 1,
              stock: idata.stock || 10,
            };
          });
        } catch {
          // ignore
        }
      }

      if (cartItems.length > 0) {
        const subtotal = data.subtotal || cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const totalItems = data.totalItems || cartItems.reduce((s, i) => s + i.quantity, 0);
        carts.push({
          ...data,
          userId: d.id,
          items: cartItems,
          subtotal,
          totalItems,
        });
      }
    }

    return carts.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  } catch (err) {
    console.error('❌ Failed to fetch all carts from Firestore:', err);
    return [];
  }
}

// ============================================================
// ORDERS & HISTORICAL SNAPSHOTS
// ============================================================

export async function createFirestoreOrder(orderData: Omit<FirestoreOrder, 'createdAt' | 'updatedAt'>): Promise<FirestoreOrder> {
  if (!db) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderData.orderNumber);

  const order: FirestoreOrder = {
    ...orderData,
    id: orderData.orderNumber,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(orderRef, order);
  return order;
}

export async function getFirestoreOrder(orderNumber: string): Promise<FirestoreOrder | null> {
  if (!db || !orderNumber) return null;
  try {
    const orderRef = doc(db, 'orders', orderNumber);
    const snap = await getDoc(orderRef);
    if (snap.exists()) {
      return snap.data() as FirestoreOrder;
    }
  } catch (err) {
    console.error('Error fetching order from Firestore:', err);
  }
  return null;
}

export async function getUserFirestoreOrders(userId: string, email?: string): Promise<FirestoreOrder[]> {
  if (!db || (!userId && !email)) return [];
  try {
    const ordersRef = collection(db, 'orders');
    const orderList: FirestoreOrder[] = [];

    if (userId) {
      const q = query(ordersRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.forEach((doc) => {
        orderList.push(doc.data() as FirestoreOrder);
      });
    }

    if (email && orderList.length === 0) {
      const qEmail = query(ordersRef, where('customer.email', '==', email));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach((doc) => {
        orderList.push(doc.data() as FirestoreOrder);
      });
    }

    // Sort in memory by createdAt desc
    return orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching user orders from Firestore:', err);
    return [];
  }
}

export async function getAllFirestoreOrders(): Promise<FirestoreOrder[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const list = snap.docs.map((d) => d.data() as FirestoreOrder);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching all orders from Firestore:', err);
    return [];
  }
}

export async function updateFirestoreOrderStatus(
  orderNumber: string,
  status: OrderStatus
): Promise<boolean> {
  if (!db || !orderNumber) return false;
  try {
    const orderRef = doc(db, 'orders', orderNumber);
    await updateDoc(orderRef, {
      orderStatus: status,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Error updating order status in Firestore:', err);
    return false;
  }
}

export async function updateFirestoreOrderPayment(
  orderNumber: string,
  paymentData: {
    paymentStatus: PaymentStatus;
    paymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }
): Promise<boolean> {
  if (!db || !orderNumber) return false;
  try {
    const orderRef = doc(db, 'orders', orderNumber);
    await updateDoc(orderRef, {
      'payment.paymentStatus': paymentData.paymentStatus,
      'payment.paymentId': paymentData.paymentId || null,
      'payment.razorpayOrderId': paymentData.razorpayOrderId || null,
      'payment.razorpaySignature': paymentData.razorpaySignature || null,
      orderStatus: paymentData.paymentStatus === 'PAID' ? 'CONFIRMED' : 'PENDING',
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Error updating order payment in Firestore:', err);
    return false;
  }
}

// ============================================================
// CUSTOM PRODUCTS COLLECTION
// ============================================================

export interface FirestoreProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  discount?: number | null;
  image: string;
  images?: string[];
  characterName?: string;
  animeName?: string;
  animeSlug?: string;
  brandName?: string;
  categoryName?: string;
  categorySlug?: string;
  stock: number;
  isSoldOut?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isLimitedEdition?: boolean;
  isPreOrder?: boolean;
  isFeatured?: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createFirestoreProduct(
  productData: Omit<FirestoreProduct, 'createdAt' | 'updatedAt'>
): Promise<FirestoreProduct> {
  if (!db) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const id = productData.id || productData.slug || `prod_${Date.now()}`;
  const prodRef = doc(db, 'products', id);

  const product: any = {
    ...productData,
    id,
    createdAt: now,
    updatedAt: now,
  };

  // Clean undefined values
  Object.keys(product).forEach((key) => {
    if (product[key] === undefined) delete product[key];
  });

  await setDoc(prodRef, product, { merge: true });
  return product as FirestoreProduct;
}

export async function getFirestoreProducts(): Promise<FirestoreProduct[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'products'));
    return snap.docs.map((d) => d.data() as FirestoreProduct);
  } catch (err) {
    console.debug('Error reading products from Firestore:', err);
    return [];
  }
}

export async function deleteFirestoreProduct(id: string): Promise<boolean> {
  if (!db || !id) return false;
  try {
    await deleteDoc(doc(db, 'products', id));
    return true;
  } catch {
    return false;
  }
}
