import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbCart, CartItem } from './types';

export async function getCartsCollection() {
  await ensureIndexes();
  return await getCollection<DbCart>('carts');
}

export async function getCartByFirebaseUid(firebaseUid: string): Promise<DbCart | null> {
  if (!firebaseUid) return null;
  const col = await getCartsCollection();
  return await col.findOne({ firebaseUid });
}

export async function syncCart(
  firebaseUid: string,
  items: CartItem[]
): Promise<DbCart> {
  if (!firebaseUid) throw new Error('firebaseUid is required to sync cart');

  const col = await getCartsCollection();
  const now = new Date();

  const sanitizedItems: CartItem[] = (items || []).map((i) => ({
    productId: i.productId,
    name: i.name,
    slug: i.slug,
    image: i.image,
    price: Number(i.price) || 0,
    quantity: Math.max(1, Number(i.quantity) || 1),
    stock: Number(i.stock) || 10,
  }));

  const subtotal = sanitizedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalItems = sanitizedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartDoc: DbCart = {
    firebaseUid,
    items: sanitizedItems,
    subtotal,
    totalItems,
    updatedAt: now,
  };

  await col.updateOne(
    { firebaseUid },
    { $set: cartDoc },
    { upsert: true }
  );

  return cartDoc;
}

export async function clearCart(firebaseUid: string): Promise<boolean> {
  if (!firebaseUid) return false;
  const col = await getCartsCollection();
  const now = new Date();

  const res = await col.updateOne(
    { firebaseUid },
    {
      $set: {
        items: [],
        subtotal: 0,
        totalItems: 0,
        updatedAt: now,
      },
    }
  );

  return res.matchedCount > 0;
}

export async function getAllCarts(): Promise<DbCart[]> {
  const col = await getCartsCollection();
  return await col.find({ 'items.0': { $exists: true } }).sort({ updatedAt: -1 }).toArray();
}
