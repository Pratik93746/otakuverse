import { create } from 'zustand';

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

let syncTimeout: NodeJS.Timeout | null = null;

async function syncMongoCartDirectly(items: CartItem[]) {
  if (typeof window === 'undefined') return;

  // Debounce rapid cart clicks
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      const { fetchWithAuth } = await import('@/lib/api-client');
      await fetchWithAuth('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      window.dispatchEvent(new CustomEvent('otakuverse-cart-updated', { detail: items }));
    } catch (err) {
      console.warn('⚠️ Failed to sync cart to MongoDB:', err);
    }
  }, 300);
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
      set({
        activeUserId: userId,
        activeUserEmail: email || null,
        activeUserName: name || null,
        items: [],
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

      if (state.activeUserId) {
        syncMongoCartDirectly(nextItems);
      }

      return {
        items: nextItems,
        isOpen: true,
      };
    });
  },

  removeItem: (productId) =>
    set((state) => {
      const nextItems = state.items.filter((i) => i.productId !== productId);
      if (state.activeUserId) {
        syncMongoCartDirectly(nextItems);
      }
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
      if (state.activeUserId) {
        syncMongoCartDirectly(nextItems);
      }
      return { items: nextItems };
    }),

  clearCart: (isSignOut = false) => {
    const { activeUserId } = get();
    set({ items: [] });

    if (typeof window !== 'undefined') {
      if (isSignOut) {
        set({
          activeUserId: null,
          activeUserEmail: null,
          activeUserName: null,
          items: [],
        });
      } else if (activeUserId) {
        import('@/lib/api-client')
          .then(({ fetchWithAuth }) => {
            fetchWithAuth('/api/cart', { method: 'DELETE' }).catch(() => {});
          })
          .catch(() => {});
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
