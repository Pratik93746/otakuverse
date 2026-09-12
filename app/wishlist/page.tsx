'use client';

import { useWishlistStore } from '@/store/wishlist';
import { useCartStore } from '@/store/cart';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, X, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore();
  const addCartItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { requireAuth } = useRequireAuth();

  const handleMoveToCart = (item: typeof items[0]) => {
    if (!requireAuth(undefined, '/wishlist')) return;

    addCartItem({
      id: item.productId,
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      stock: 99,
    });
    removeItem(item.productId);
    toast.success('Moved to cart!', { icon: '🛍️' });
    openCart();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="container-wide">
          <h1 className="font-heading text-4xl tracking-widest uppercase">WISHLIST</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="container-wide py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="w-20 h-20 text-gray-200 mb-6" />
            <h2 className="font-heading text-3xl tracking-wider mb-3">YOUR WISHLIST IS EMPTY</h2>
            <p className="text-gray-500 mb-8">Save figures you love for later.</p>
            <Link href="/shop" className="btn-primary px-8 py-4">
              BROWSE FIGURES
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-gray-100 group"
                >
                  <div className="relative aspect-product bg-gray-50 overflow-hidden">
                    <Link href={`/product/${item.slug}`}>
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="font-heading text-3xl text-gray-300">OTV</span>
                        </div>
                      )}
                    </Link>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3">
                    <Link href={`/product/${item.slug}`} className="text-xs font-semibold text-gray-900 hover:text-brand-red transition-colors line-clamp-2">
                      {item.name}
                    </Link>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-bold text-brand-red">{formatPrice(item.price)}</span>
                      {item.compareAtPrice && item.compareAtPrice > item.price && (
                        <span className="text-xs text-gray-400 line-through">{formatPrice(item.compareAtPrice)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleMoveToCart(item)}
                      className="mt-2 w-full py-2 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-brand-red transition-colors flex items-center justify-center gap-1"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      ADD TO BAG
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
