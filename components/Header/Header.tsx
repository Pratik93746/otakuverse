'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Menu,
  Search,
  ShoppingBag,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import { SearchModal } from '@/components/Search/SearchModal';
import { MobileMenu } from './MobileMenu';
import { UserMenu } from './UserMenu';

const navLinks = [
  { label: 'Shop', href: '/shop' },
  { label: 'Figures', href: '/shop?category=figures' },
  { label: 'Katanas', href: '/shop?category=katanas' },
  { label: 'Keychains', href: '/shop?category=keychains' },
  { label: 'Clothing', href: '/shop?category=clothing' },
  { label: 'Collectables', href: '/shop?category=collectables' },
  { label: 'New Drops', href: '/shop?filter=new' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const totalItems = useCartStore((s) => s.getTotalItems());
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled ? 'header-scrolled' : 'bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.06]'
        )}
        style={{ height: 'var(--header-height)' }}
      >
        <div className="container-wide h-full flex items-center justify-between">
          {/* Mobile: Hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center w-10 h-10 gap-1.5 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold tracking-widest uppercase hidden xs:block text-gray-300">
              MENU
            </span>
          </div>

          {/* Official BAKA Brand Logo with Luffy */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 flex items-center group py-1"
          >
            <Image
              src="/custom/baka_header_brand.png"
              alt="BAKA - Clothing Style And More"
              width={320}
              height={88}
              className="h-12 sm:h-14 lg:h-[64px] w-auto object-contain transition-all duration-300 group-hover:brightness-125 group-hover:drop-shadow-[0_0_16px_rgba(239,68,68,0.7)]"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-semibold tracking-[0.12em] uppercase text-gray-300 hover:text-brand-red transition-colors duration-150 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-red group-hover:w-full transition-all duration-200" />
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors rounded-none"
              aria-label="Search"
            >
              <Search className="w-4.5 h-4.5" strokeWidth={2} />
            </button>

            {/* Admin Dashboard Direct Access — Only visible to authenticated ADMIN users */}
            {session?.user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase text-purple-200 bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/50 rounded transition-all group shadow-xs"
                title="Store Management Dashboard"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Admin</span>
              </Link>
            )}

            {/* Account — Desktop */}
            <div className="hidden lg:flex items-center">
              <UserMenu />
            </div>

            {/* Wishlist — Desktop */}
            <Link
              href="/wishlist"
              className="hidden lg:flex w-10 h-10 items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-4.5 h-4.5" strokeWidth={2} />
            </Link>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4.5 h-4.5" strokeWidth={2} />
              {mounted && totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
                >
                  {totalItems > 99 ? '99+' : totalItems}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div style={{ height: 'var(--header-height)' }} />

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
