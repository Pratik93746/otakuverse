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

  // The cart is only a convenience copy (checkout re-prices from the database), but it is stored
  // and shown to admins, so keep it bounded and strictly typed.
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  const sanitizedItems: CartItem[] = (Array.isArray(items) ? items : []).slice(0, 50).filter((i) => i && typeof i === 'object').map((i) => ({
    productId: s(i.productId, 200),
    name: s(i.name, 200),
    slug: s(i.slug, 200),
    image: s(i.image, 1000),
    price: Math.min(Math.max(0, Number(i.price) || 0), 1_000_000),
    quantity: Math.min(20, Math.max(1, Math.floor(Number(i.quantity)) || 1)),
    stock: Math.min(100_000, Math.max(0, Math.floor(Number(i.stock)) || 10)),
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
