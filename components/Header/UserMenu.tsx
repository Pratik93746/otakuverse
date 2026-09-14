'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  LogOut,
  Package,
  Heart,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  LogIn,
  UserPlus,
  Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cart';
import { signOutFirebase } from '@/lib/firebase';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    toast.success('Signed out successfully. See you soon, Hunter! 👋');
    try {
      useCartStore.getState().clearCart(true);
      await signOutFirebase();
    } catch {
      // ignore
    }
    await signOut({ callbackUrl: '/login' });
  };

  // If loading session state, display placeholder
  if (status === 'loading') {
    return (
      <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse flex items-center justify-center text-gray-500">
        <User className="w-4 h-4 opacity-50" />
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // LOGGED IN STATE
  // ──────────────────────────────────────────────
  if (session?.user) {
    const isAdmin = session.user.role === 'ADMIN';
    const userInitial = session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U';

    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/20 transition-all duration-200 group cursor-pointer"
          aria-label="User profile menu"
          aria-expanded={isOpen}
        >
          {/* Avatar Pill */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105 ${
              isAdmin
                ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white ring-1 ring-purple-400'
                : 'bg-gradient-to-tr from-brand-red to-orange-500 text-white ring-1 ring-red-400'
            }`}
          >
            {userInitial}
          </div>

          <span className="text-xs font-semibold text-gray-200 max-w-[90px] truncate hidden xl:inline-block">
            {session.user.name?.split(' ')[0] ?? 'Hunter'}
          </span>

          {isAdmin && (
            <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
              ADMIN
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-white' : 'group-hover:text-white'
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0F0E1A]/95 border border-white/[0.12] backdrop-blur-xl shadow-2xl p-2 z-50 text-white overflow-hidden"
            >
              {/* Profile Card Header */}
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-heading text-lg font-bold shadow-md ${
                      isAdmin
                        ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white'
                        : 'bg-gradient-to-tr from-brand-red to-orange-500 text-white'
                    }`}
                  >
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {session.user.name ?? 'Hunter'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                    <span
                      className={`inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        isAdmin
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}
                    >
                      {isAdmin ? 'Special Grade Admin' : 'Hunter Collector'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-600/20 rounded-lg transition-colors group"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors group"
                >
                  <User className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
                  <span>My Profile & Stats</span>
                </Link>

                <Link
                  href="/account/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors group"
                >
                  <Package className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
                  <span>Order History</span>
                </Link>

                <Link
                  href="/wishlist"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors group"
                >
                  <Heart className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
                  <span>Saved Wishlist</span>
                </Link>

                <Link
                  href="/login-realm"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 rounded-lg transition-colors group"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
                  <span>3D Domain Realm Portal</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.08] my-1.5" />

              {/* Sign Out Action */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Portal</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // LOGGED OUT STATE
  // ──────────────────────────────────────────────
  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-1.5">
        <Link
          href="/login"
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-red/90 hover:bg-brand-red text-white text-xs font-heading font-black tracking-widest uppercase transition-all duration-200 shadow-md shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-0.5"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>SIGN IN</span>
        </Link>

        {/* Quick Menu Opener */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Quick Login Menu"
          aria-expanded={isOpen}
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
        </button>
      </div>

      {/* Guest Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0F0E1A]/95 border border-white/[0.12] backdrop-blur-xl shadow-2xl p-3 z-50 text-white overflow-hidden"
          >
            {/* Header Banner */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-black/40 border border-white/[0.08] mb-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-xs font-heading font-black uppercase tracking-wider text-white">
                  BAKA HUNTER PORTAL
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Sign in to save figures, track orders, and unlock collector perks.
              </p>
            </div>

            {/* Direct Links */}
            <div className="space-y-1 mb-2.5">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-white bg-brand-red/20 hover:bg-brand-red/30 border border-brand-red/30 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-brand-red" />
                  <span>Hunter Portal Login</span>
                </div>
                <span className="text-[10px] text-red-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>

              <Link
                href="/login-realm"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-cyan-200 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>3D Domain Realm Login</span>
                </div>
                <span className="text-[10px] text-cyan-400 group-hover:translate-x-0.5 transition-transform">🌀</span>
              </Link>

              <Link
                href="/signup"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-gray-400" />
                  <span>Create New Account</span>
                </div>
                <span className="text-[10px] text-gray-500 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
