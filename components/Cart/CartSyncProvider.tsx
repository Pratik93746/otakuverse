'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/cart';
import { auth } from '@/lib/firebase';
import {
  getFirestoreCart,
  syncCartToFirestore,
  saveFirestoreUserProfile,
} from '@/lib/firestore';

export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const setUser = useCartStore((s) => s.setUser);
  const setItems = useCartStore((s) => s.setItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const prevUserIdRef = useRef<string | null>(null);

  // Synchronize Active User with Session and Firestore Cart
  useEffect(() => {
    const activeUserId =
      session?.user?.id ||
      (session?.user?.email
        ? 'usr_' + session.user.email.toLowerCase().replace(/[^a-z0-9]/g, '_')
        : null);

    // 1. User is Authenticated
    if (activeUserId && session?.user) {
      const userEmail = session.user.email || '';
      const userName = session.user.name || userEmail.split('@')[0] || 'Collector';

      // Switch active user in store
      setUser(activeUserId, userEmail, userName);
      prevUserIdRef.current = activeUserId;

      // Fetch this specific user's cart from Firestore
      getFirestoreCart(activeUserId)
        .then((remoteCart) => {
          if (remoteCart && remoteCart.items && remoteCart.items.length > 0) {
            console.log(
              '🔥 [Firestore] Loaded isolated cart for user:',
              activeUserId,
              remoteCart.items.length,
              'items'
            );
            setItems(
              remoteCart.items.map((i) => ({
                id: i.productId,
                productId: i.productId,
                name: i.name,
                slug: i.slug,
                image: i.image,
                price: i.price,
                quantity: i.quantity,
                stock: i.stock,
              }))
            );
          } else {
            // Check if user has saved items in their user-scoped local storage
            if (typeof window !== 'undefined') {
              try {
                const saved = localStorage.getItem(`otakuverse-cart-${activeUserId}`);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setItems(parsed);
                    return;
                  }
                }
              } catch {}
            }
            // If neither Firestore nor user storage has items, cart is strictly empty.
            // NEVER copy another user's cart!
            setItems([]);
          }
        })
        .catch((err) => {
          console.warn('⚠️ [CartSyncProvider] Error loading user cart:', err);
        });

      // Save user profile to Firestore
      saveFirestoreUserProfile({
        uid: activeUserId,
        name: userName,
        email: userEmail,
      }).catch(() => {});
    } else if (status === 'unauthenticated') {
      // 2. User Logged Out / Visitor
      if (prevUserIdRef.current) {
        console.log('👤 User logged out, resetting cart');
        clearCart(true);
        prevUserIdRef.current = null;
      } else {
        setUser(null, null, null);
      }
    }
  }, [session, status, setUser, setItems, clearCart]);

  // Listen for custom cart-updated events to sync to Firestore
  useEffect(() => {
    const handleCartUpdated = (e: Event) => {
      const { activeUserId, activeUserEmail, activeUserName, items } =
        useCartStore.getState();
      const targetUserId = activeUserId || (auth?.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.uid : null);

      if (!targetUserId) {
        // Guest user without an authenticated user ID; skip remote Firestore sync
        return;
      }

      const currentItems = (e as CustomEvent).detail || items;
      const email =
        activeUserEmail || auth?.currentUser?.email || session?.user?.email || '';
      const name =
        activeUserName ||
        auth?.currentUser?.displayName ||
        session?.user?.name ||
        'Collector';

      syncCartToFirestore(
        targetUserId,
        email,
        name,
        currentItems.map((i: any) => ({
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
          email,
          name,
        }
      ).catch((err) => {
        console.warn('Cart sync notice on event:', err?.message || err);
      });
    };

    window.addEventListener('otakuverse-cart-updated', handleCartUpdated);
    return () => window.removeEventListener('otakuverse-cart-updated', handleCartUpdated);
  }, [session]);

  return <>{children}</>;
}
