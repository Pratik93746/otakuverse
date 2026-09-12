'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  X,
  ChevronRight,
  User,
  Heart,
  Package,
  ShieldCheck,
  Sparkles,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cart';
import { signOutFirebase } from '@/lib/firebase';

const navLinks = [
  { label: 'Shop All', href: '/shop', description: 'Browse all figures' },
  { label: 'Archive Vault', href: '/archive', description: '3D Gallery & Rarities' },
  { label: 'Characters', href: '/characters', description: 'Shop by character' },
  { label: 'Anime', href: '/anime', description: 'Shop by franchise' },
  { label: 'New Arrivals', href: '/shop?filter=new', description: 'Latest additions' },
  { label: 'Best Sellers', href: '/shop?filter=bestsellers', description: 'Top picks' },
  { label: 'Limited Edition', href: '/shop?filter=limited', description: 'Exclusive drops' },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    onClose();
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 left-0 h-full w-84 max-w-[88vw] bg-[#0C0B14] z-50 lg:hidden flex flex-col shadow-2xl border-r border-white/[0.08] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-black/40">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <span className="font-heading text-2xl tracking-[0.15em] text-white">OTAKUVERSE</span>
              </Link>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Banner at top of menu */}
            {session?.user ? (
              <div className="p-4 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-heading text-lg font-bold text-white shadow-md ${
                    session.user.role === 'ADMIN'
                      ? 'bg-gradient-to-tr from-purple-600 to-pink-500'
                      : 'bg-gradient-to-tr from-brand-red to-orange-500'
                  }`}
                >
                  {session.user.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">
                      {session.user.name ?? 'Hunter'}
                    </p>
                    {session.user.role === 'ADMIN' && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-gradient-to-r from-red-950/40 to-black/40 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold text-gray-200">Hunter Portal</span>
                </div>
                <Link
                  href="/login"
                  onClick={onClose}
                  className="text-xs font-bold text-brand-red hover:underline uppercase"
                >
                  Sign In →
                </Link>
              </div>
            )}

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto py-2">
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Explore Collections
              </div>
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.04] border-b border-white/[0.03] group"
                  >
                    <div>
                      <p className="font-semibold text-xs tracking-wider uppercase text-gray-200 group-hover:text-brand-red transition-colors">
                        {link.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{link.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                  </Link>
                </motion.div>
              ))}

              <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Special Realms
              </div>
              <Link
                href="/login-realm"
                onClick={onClose}
                className="flex items-center justify-between px-5 py-3 hover:bg-cyan-950/20 border-b border-white/[0.03] group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="font-semibold text-xs tracking-wider uppercase text-cyan-300">
                      3D Domain Realm
                    </p>
                    <p className="text-[11px] text-gray-400">Interactive 3D Characters</p>
                  </div>
                </div>
                <span className="text-xs text-cyan-400">🌀</span>
              </Link>
            </nav>

            {/* Bottom Actions */}
            <div className="border-t border-white/[0.08] p-4 bg-black/30 space-y-2">
              <Link
                href="/wishlist"
                onClick={onClose}
                className="flex items-center gap-3 text-xs font-medium text-gray-300 hover:text-brand-red transition-colors py-1.5"
              >
                <Heart className="w-4 h-4 text-brand-red" />
                Wishlist
              </Link>

              {session?.user ? (
                <>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex items-center gap-3 text-xs font-medium text-gray-300 hover:text-brand-red transition-colors py-1.5"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    My Account & Stats
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={onClose}
                    className="flex items-center gap-3 text-xs font-medium text-gray-300 hover:text-brand-red transition-colors py-1.5"
                  >
                    <Package className="w-4 h-4 text-gray-400" />
                    My Orders
                  </Link>
                  {session.user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      onClick={onClose}
                      className="flex items-center gap-3 text-xs font-semibold text-purple-300 hover:text-purple-200 transition-colors py-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>Admin Dashboard</span>
                      <span className="ml-auto text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold uppercase">
                        Admin
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 text-xs font-medium text-red-400 hover:text-red-300 transition-colors py-2 pt-3 border-t border-white/[0.06] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-heading font-black tracking-wider uppercase transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={onClose}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-heading font-black tracking-wider uppercase transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Register
                    </Link>
                  </div>
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin Dashboard</span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
