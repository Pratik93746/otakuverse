import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { Sparkles, Shield, ArrowLeft, Flame, Package } from 'lucide-react';
import ShopClient from '../shop/ShopClient';

export const metadata: Metadata = {
  title: 'Official Anime Archive Collection (147 Items) | BAKA',
  description: 'Explore our complete authentic 147-piece anime figure archive collection across Dragon Ball, Naruto, One Piece, Demon Slayer, JJK, and more.',
};

export default function ArchiveVaultPage() {
  const archiveProducts = MOCK_PRODUCTS.filter((p) => p.image.startsWith('/archive/'));

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-gray-950 via-[#150a1a] to-gray-950 text-white py-12 md:py-16 border-b border-gray-800 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(230,51,41,0.5) 0%, transparent 60%)',
          }}
        />
        <div className="container-wide relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-red mb-4 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-red" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-brand-red">
              100% COMPLETE ARCHIVE COLLECTION
            </span>
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl tracking-widest uppercase text-white">
            ARCHIVE VAULT ({archiveProducts.length} COLLECTIBLES)
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mt-2 leading-relaxed font-normal">
            Every authentic figure, statue, and collectible imported from the verified <strong className="text-white">Image/Archive</strong> collection. Direct import with mint collector packaging.
          </p>

          <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-white/10 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand-red" />
              <span>{archiveProducts.length} Verified Archive Items</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Instant Add to Bag & Checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-yellow-400" />
              <span>Mint-Condition Japan Packaging</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Catalog Grid with Client Filters & Quick View */}
      <div className="container-wide py-10">
        <Suspense fallback={<div className="py-20 text-center text-gray-400 font-heading text-xl">Loading Archive Vault...</div>}>
          <ShopClient />
        </Suspense>
      </div>
    </div>
  );
}
