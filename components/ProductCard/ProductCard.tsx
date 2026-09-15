'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Eye, X, ShoppingBag, Zap, Check } from 'lucide-react';
import { cn, formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';

export interface ProductCardData {
  id?: string;
  _id?: any;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  characterName?: string;
  animeName?: string;
  brandName?: string;
  stock: number;
  isSoldOut?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isLimitedEdition?: boolean;
  isPreOrder?: boolean;
  description?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
  priority?: boolean;
}

export function ProductCard({ product, className, priority }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const prodId = product.id || product._id?.toString() || product.slug;
  const addItem = useCartStore((s) => s.addItem);
  const { requireAuth } = useRequireAuth();
  const { toggleItem, isWishlisted } = useWishlistStore();
  const wishlisted = mounted && isWishlisted(prodId);
  const discount = calculateDiscount(product.price, product.compareAtPrice ?? 0);
  const isSoldOut = product.isSoldOut || product.stock === 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;
    if (!requireAuth()) return;

    addItem({
      id: prodId,
      productId: prodId,
      name: product.name,
      slug: product.slug,
      image: product.image ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
    });
    toast.success('Added to bag!', {
      icon: '🛍️',
      style: { borderLeft: '4px solid #E63329' },
    });
  };

  const handleQuickBuy = () => {
    if (!requireAuth(undefined, '/checkout')) return;

    addItem({
      id: prodId,
      productId: prodId,
      name: product.name,
      slug: product.slug,
      image: product.image ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
    });
    setQuickViewOpen(false);
    router.push('/checkout');
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      productId: prodId,
      name: product.name,
      slug: product.slug,
      image: product.image ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice,
    });
    toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist!', {
      icon: wishlisted ? '💔' : '❤️',
    });
  };

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
      <div className={cn('product-card block relative group h-full flex flex-col justify-between', className)}>
        <Link href={`/product/${product.slug}`} className="block">
          {/* Image Container */}
          <div className="relative overflow-hidden bg-[#1A1926] aspect-product rounded-t-[5px]">
            {product.image && !imgError ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1926] to-[#12111A] flex items-center justify-center">
                <span className="font-heading text-4xl text-gray-600 tracking-widest font-black">OTV</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
              {isSoldOut ? (
                <span className="badge-sold-out">SOLD OUT</span>
              ) : (
                <>
                  {discount > 0 && <span className="badge-sale">{discount}% OFF</span>}
                  {product.isNewArrival && <span className="badge-new">NEW</span>}
                  {product.isLimitedEdition && <span className="badge-limited">LIMITED</span>}
                  {product.isPreOrder && <span className="badge-preorder">PRE-ORDER</span>}
                </>
              )}
            </div>

            {/* Top Right Action Icons */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
              <button
                onClick={handleWishlist}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center bg-black/70 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer',
                  wishlisted ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
                )}
                aria-label="Wishlist"
              >
                <Heart className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={wishlisted ? 0 : 2} />
              </button>

              <button
                onClick={openModal}
                className="w-8 h-8 rounded-md flex items-center justify-center bg-black/70 backdrop-blur-sm shadow-sm text-gray-300 hover:text-brand-red transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                title="Quick View"
                aria-label="Quick View"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Add to Cart Bar */}
            <div className="absolute inset-x-0 bottom-0 p-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className={cn(
                  'w-full py-2.5 text-xs font-bold tracking-widest uppercase text-white transition-all flex items-center justify-center gap-1.5 rounded-md cursor-pointer',
                  isSoldOut ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#0A0A0F] hover:bg-brand-red shadow-lg'
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {isSoldOut ? 'Sold Out' : 'Add to Bag'}
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-3">
            {(product.animeName || product.characterName) && (
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 truncate mb-1">
                {product.characterName ?? product.animeName}
              </p>
            )}

            <h3 className="text-xs sm:text-sm font-semibold text-gray-200 line-clamp-2 leading-snug mb-2 group-hover:text-brand-red transition-colors">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-brand-red">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Mobile Add to Cart */}
            {!isSoldOut && (
              <button
                onClick={handleAddToCart}
                className="mt-2 w-full py-2 text-[10px] font-bold tracking-widest uppercase text-white bg-black hover:bg-brand-red transition-colors sm:hidden flex items-center justify-center gap-1 rounded-md"
              >
                <ShoppingBag className="w-3 h-3" />
                Add to Bag
              </button>
            )}
          </div>
        </Link>
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#12111A] border border-white/10 shadow-2xl z-10 overflow-hidden flex flex-col md:flex-row max-h-[90vh] rounded-xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setQuickViewOpen(false)}
                className="absolute top-3 right-3 z-20 w-8 h-8 bg-[#1A1926] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Image */}
              <div className="w-full md:w-1/2 bg-[#1A1926] relative aspect-square md:aspect-auto min-h-[250px] p-4 flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-heading text-4xl text-gray-600">
                    OTV
                  </div>
                )}
                {discount > 0 && (
                  <span className="badge-sale absolute top-3 left-3">{discount}% OFF</span>
                )}
              </div>

              {/* Modal Info */}
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
                <div>
                  {(product.animeName || product.brandName) && (
                    <p className="text-[11px] font-bold tracking-wider uppercase text-brand-red mb-1">
                      {product.brandName ?? product.animeName}
                    </p>
                  )}

                  <h2 className="font-heading text-2xl tracking-wide uppercase text-white leading-tight mb-2 font-black">
                    {product.name}
                  </h2>

                  {product.characterName && (
                    <p className="text-xs text-gray-400 mb-3">
                      Character: <strong className="text-white">{product.characterName}</strong>
                    </p>
                  )}

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold text-brand-red">{formatPrice(product.price)}</span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                    {product.description ??
                      'Official authentic collectible figure sculpted with premium grade PVC and dynamic anime posture details.'}
                  </p>

                  <p className="text-xs text-green-600 font-semibold mb-6 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> In Stock & Ready to Dispatch
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <button
                    onClick={handleAddToCart}
                    className="btn-dark w-full justify-center py-3 text-xs rounded-md cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" /> ADD TO BAG
                  </button>
                  <button
                    onClick={handleQuickBuy}
                    className="btn-primary w-full justify-center py-3 text-xs rounded-md cursor-pointer"
                  >
                    <Zap className="w-4 h-4" /> BUY NOW
                  </button>
                  <Link
                    href={`/product/${product.slug}`}
                    className="block text-center text-xs font-semibold text-gray-400 hover:text-brand-red uppercase tracking-wider pt-2"
                  >
                    View Full Product Details →
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
