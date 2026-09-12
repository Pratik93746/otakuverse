'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/cart';
import { auth, onAuthStateChanged } from '@/lib/firebase';
import {
  getFirestoreCart,
  syncCartToFirestore,
  saveFirestoreUserProfile,
} from '@/lib/firestore';

export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const items = useCartStore((s) => s.items);
  const setItems = useCartStore((s) => s.setItems);
  const isInitialSyncDone = useRef(false);

  // Sync Firebase Auth state & Profile & Cart
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          console.log('🔥 [Firebase Auth] Active authenticated user:', fbUser.uid, fbUser.email);

          // 1. Save user profile to Firestore & persistent collector store
          if (!fbUser.isAnonymous || session?.user) {
            const userProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || session?.user?.name || undefined,
              email: fbUser.email || session?.user?.email || `guest_${fbUser.uid.substring(0, 5)}@otakuverse.com`,
              phone: fbUser.phoneNumber || undefined,
            };
            await saveFirestoreUserProfile(userProfile);

            if (userProfile.email && !userProfile.email.startsWith('guest_')) {
              fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userProfile),
              }).catch(() => {});
            }
          }

          // 2. Fetch user's cart from Firestore
          const remoteCart = await getFirestoreCart(fbUser.uid);
          if (remoteCart && remoteCart.items && remoteCart.items.length > 0) {
            console.log('🔥 [Firestore] Restoring cart from Firestore for user:', fbUser.uid, remoteCart.items.length, 'items');
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
            // If remote cart is empty but local store has items, push local items to Firestore
            const currentLocalItems = useCartStore.getState().items;
            if (currentLocalItems.length > 0) {
              console.log('🔥 [Firestore] Pushing local cart to Firestore for active session:', fbUser.uid);
              await syncCartToFirestore(
                fbUser.uid,
                fbUser.email || session?.user?.email || '',
                fbUser.displayName || session?.user?.name || fbUser.email?.split('@')[0] || 'Collector',
                currentLocalItems.map((i) => ({
                  productId: i.productId,
                  name: i.name,
                  slug: i.slug,
                  image: i.image,
                  price: i.price,
                  quantity: i.quantity,
                  stock: i.stock,
                })),
                {
                  id: session?.user?.id,
                  email: session?.user?.email || fbUser.email || undefined,
                  name: session?.user?.name || fbUser.displayName || undefined,
                }
              );
            }
          }
        } catch (err) {
          console.warn('⚠️ [CartSyncProvider] Auth sync notice:', err);
        }
      } else {
        // Ensure every visitor has an active Firebase credential so carts sync to Firestore
        try {
          const { signInFirebaseAnonymously } = await import('@/lib/firebase');
          await signInFirebaseAnonymously();
        } catch (anonErr) {
          console.debug('Firebase anonymous sign-in notice:', anonErr);
        }
      }
      isInitialSyncDone.current = true;
    });

    return () => unsubscribe();
  }, [session, setItems]);

  // Listen for custom cart-updated events
  useEffect(() => {
    const handleCartUpdated = (e: Event) => {
      // Must have an active Firebase Auth user to write to Firestore
      const fbUser = auth?.currentUser;
      if (!fbUser || !fbUser.uid) {
        // User not logged in to Firebase yet; skip remote Firestore sync
        return;
      }

      const currentItems = (e as CustomEvent).detail || useCartStore.getState().items;
      const email = fbUser.email || session?.user?.email || '';
      const name = fbUser.displayName || session?.user?.name || fbUser.email?.split('@')[0] || 'Collector';

      syncCartToFirestore(
        fbUser.uid,
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
          id: session?.user?.id,
          email: session?.user?.email || undefined,
          name: session?.user?.name || undefined,
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
