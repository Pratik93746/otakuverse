import { create } from 'zustand';
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
  activeUserId: string | null;
  activeUserEmail: string | null;
  activeUserName: string | null;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: (isSignOut?: boolean) => void;
  setItems: (items: CartItem[]) => void;
  setUser: (userId: string | null, email?: string | null, name?: string | null) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Computed
  getTotalItems: () => number;
  getSubtotal: () => number;
}

function getStorageKey(userId?: string | null): string {
  if (!userId) return 'otakuverse-cart-guest';
  return `otakuverse-cart-${userId}`;
}

function saveToLocalStorage(userId: string | null, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.debug('LocalStorage write notice:', e);
  }
}

async function syncFirestoreCartDirectly(
  items: CartItem[],
  activeUserId: string | null,
  activeUserEmail: string | null,
  activeUserName: string | null
) {
  if (typeof window === 'undefined') return;
  try {
    const fbUser = auth?.currentUser;
    const targetUserId = activeUserId || (fbUser && !fbUser.isAnonymous ? fbUser.uid : null);

    if (targetUserId) {
      await syncCartToFirestore(
        targetUserId,
        activeUserEmail || fbUser?.email || '',
        activeUserName || fbUser?.displayName || 'Collector',
        items.map((i) => ({
          productId: i.productId,
          name: i.name,
          slug: i.slug,
          image: i.image,
          price: i.price,
          quantity: i.quantity,
          stock: i.stock,
        })),
        {
          id: targetUserId,
          email: activeUserEmail || fbUser?.email || undefined,
          name: activeUserName || fbUser?.displayName || undefined,
        }
      );
    }

    // Also dispatch custom event for any listening providers
    window.dispatchEvent(new CustomEvent('otakuverse-cart-updated', { detail: items }));
  } catch (err) {
    console.warn('Failed to trigger cart sync:', err);
  }
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  isOpen: false,
  activeUserId: null,
  activeUserEmail: null,
  activeUserName: null,

  setUser: (userId, email, name) => {
    const currentUserId = get().activeUserId;
    if (currentUserId !== userId) {
      // Switching user context: load user-scoped items from localStorage if available
      let userItems: CartItem[] = [];
      if (typeof window !== 'undefined' && userId) {
        try {
          const raw = localStorage.getItem(getStorageKey(userId));
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) userItems = parsed;
          }
        } catch {}
      }

      set({
        activeUserId: userId,
        activeUserEmail: email || null,
        activeUserName: name || null,
        items: userItems,
      });
      return;
    }

    set({
      activeUserId: userId,
      activeUserEmail: email || null,
      activeUserName: name || null,
    });
  },

  setItems: (items) => {
    saveToLocalStorage(get().activeUserId, items);
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

      saveToLocalStorage(state.activeUserId, nextItems);
      syncFirestoreCartDirectly(
        nextItems,
        state.activeUserId,
        state.activeUserEmail,
        state.activeUserName
      );

      return {
        items: nextItems,
        isOpen: true,
      };
    });
  },

  removeItem: (productId) =>
    set((state) => {
      const nextItems = state.items.filter((i) => i.productId !== productId);
      saveToLocalStorage(state.activeUserId, nextItems);
      syncFirestoreCartDirectly(
        nextItems,
        state.activeUserId,
        state.activeUserEmail,
        state.activeUserName
      );
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
      saveToLocalStorage(state.activeUserId, nextItems);
      syncFirestoreCartDirectly(
        nextItems,
        state.activeUserId,
        state.activeUserEmail,
        state.activeUserName
      );
      return { items: nextItems };
    }),

  clearCart: (isSignOut = false) => {
    const { activeUserId } = get();
    set({ items: [] });

    if (typeof window !== 'undefined') {
      if (isSignOut) {
        // On sign out: reset memory state and guest cart
        // Preserves user's remote Firestore cart for next login
        set({
          activeUserId: null,
          activeUserEmail: null,
          activeUserName: null,
          items: [],
        });
        try {
          localStorage.removeItem('otakuverse-cart-guest');
        } catch {}
      } else {
        // Explicit clear: wipe active user's local and remote Firestore cart
        if (activeUserId) {
          clearFirestoreCart(activeUserId).catch((err) => {
            console.error('Failed to clear cart in Firestore:', err);
          });
        }
        try {
          localStorage.removeItem(getStorageKey(activeUserId));
        } catch {}
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
}));
