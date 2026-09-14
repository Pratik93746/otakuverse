'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/cart';
import { fetchWithAuth } from '@/lib/api-client';

export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const setUser = useCartStore((s) => s.setUser);
  const setItems = useCartStore((s) => s.setItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const prevUserIdRef = useRef<string | null>(null);

  // Synchronize Active User with Session and MongoDB Cart
  useEffect(() => {
    const activeUserId = session?.user?.id || null;

    // 1. User is Authenticated
    if (activeUserId && session?.user) {
      const userEmail = session.user.email || '';
      const userName = session.user.name || userEmail.split('@')[0] || 'Collector';

      // Switch active user in store
      setUser(activeUserId, userEmail, userName);
      prevUserIdRef.current = activeUserId;

      // Fetch user's cart from MongoDB via API
      fetchWithAuth('/api/cart')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data?.cart?.items && Array.isArray(data.cart.items)) {
            setItems(
              data.cart.items.map((i: any) => ({
                id: i.productId,
                productId: i.productId,
                name: i.name,
                slug: i.slug,
                image: i.image,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                stock: Number(i.stock) || 10,
              }))
            );
          } else {
            setItems([]);
          }
        })
        .catch((err) => {
          console.debug('Cart fetch notice:', err?.message || err);
        });

      // Ensure user profile in MongoDB
      fetchWithAuth('/api/users/me', {
        method: 'POST',
        body: JSON.stringify({
          name: userName,
        }),
      }).catch(() => {});
    } else if (status === 'unauthenticated') {
      // 2. User Logged Out / Visitor
      if (prevUserIdRef.current) {
        clearCart(true);
        prevUserIdRef.current = null;
      } else {
        setUser(null, null, null);
      }
    }
  }, [session, status, setUser, setItems, clearCart]);

  return <>{children}</>;
}
