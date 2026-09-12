'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cart';
import { signOutFirebase } from '@/lib/firebase';

export function AccountSignOutButton() {
  const handleSignOut = async () => {
    toast.success('Signed out successfully 👋');
    try {
      useCartStore.getState().clearCart(true);
      await signOutFirebase();
    } catch {
      // ignore
    }
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      onClick={handleSignOut}
      type="button"
      className="btn-ghost border border-gray-200 text-xs py-2 px-4 flex items-center gap-1.5 text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" /> Sign Out
    </button>
  );
}
