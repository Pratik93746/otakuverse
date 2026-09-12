import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '@/lib/firebase';
import { syncCartToFirestore, clearFirestoreCart } from '@/lib/firestore';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  
  // Computed
  getTotalItems: () => number;
  getSubtotal: () => number;
}

async function syncFirestoreCartDirectly(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const fbUser = auth?.currentUser;

    if (fbUser && fbUser.uid) {
      await syncCartToFirestore(
        fbUser.uid,
        fbUser.email || '',
        fbUser.displayName || fbUser.email?.split('@')[0] || 'Collector',
        items.map((i) => ({
          productId: i.productId,
          name: i.name,
          slug: i.slug,
          image: i.image,
          price: i.price,
          quantity: i.quantity,
          stock: i.stock,
        }))
      );
    }

    // Also dispatch custom event for any listening providers
    window.dispatchEvent(new CustomEvent('otakuverse-cart-updated', { detail: items }));
  } catch (err) {
    console.warn('Failed to trigger cart sync:', err);
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      setItems: (items) => {
        set({ items });
      },

      addItem: (newItem) => {
        set((state) => {
          let nextItems: CartItem[];
          const existing = state.items.find((i) => i.productId === newItem.productId);
          if (existing) {
            nextItems = state.items.map((i) =>
              i.productId === newItem.productId
                ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                : i
            );
          } else {
            nextItems = [...state.items, { ...newItem, quantity: 1 }];
          }

          syncFirestoreCartDirectly(nextItems);

          return {
            items: nextItems,
            isOpen: true,
          };
        });
      },

      removeItem: (productId) =>
        set((state) => {
          const nextItems = state.items.filter((i) => i.productId !== productId);
          syncFirestoreCartDirectly(nextItems);
          return { items: nextItems };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          const nextItems =
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: Math.min(quantity, i.stock) }
                    : i
                );
          syncFirestoreCartDirectly(nextItems);
          return { items: nextItems };
        }),

      clearCart: () => {
        set({ items: [] });
        if (typeof window !== 'undefined') {
          const fbUser = auth?.currentUser;
          if (fbUser?.uid) {
            clearFirestoreCart(fbUser.uid).catch((err) => {
              console.error('Failed to clear cart in Firestore:', err);
            });
          }
          window.dispatchEvent(new CustomEvent('otakuverse-cart-updated', { detail: [] }));
        }
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'otakuverse-cart',
    }
  )
);
