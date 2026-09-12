'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export function useRequireAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = status === 'authenticated' && !!session?.user;

  const requireAuth = (callback?: () => void, customCallbackUrl?: string): boolean => {
    if (status === 'loading') {
      return false;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to add products to your bag or checkout!', {
        icon: '🔐',
        duration: 3500,
        style: {
          borderLeft: '4px solid #E63329',
          background: '#12111A',
          color: '#FFFFFF',
        },
      });
      const dest = customCallbackUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname || '/');
      router.push(`/login?callbackUrl=${encodeURIComponent(dest)}`);
      return false;
    }

    if (callback) {
      callback();
    }
    return true;
  };

  return {
    session,
    status,
    isAuthenticated,
    requireAuth,
  };
}
