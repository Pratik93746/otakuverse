'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart, ShoppingBag, Zap, Star, Minus, Plus,
  ChevronRight, RotateCcw, Package, Shield, Truck,
  Bell, ShieldCheck, Award,
} from 'lucide-react';
import { formatPrice, calculateDiscount, cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import Model3DViewer from '@/components/Product/Model3DViewer';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { BackInStockModal } from '@/components/Product/BackInStockModal';
import { RecentlyViewed, saveRecentlyViewed } from '@/components/Product/RecentlyViewed';

// Types
interface ProductImage { id: string; url: string; alt?: string | null; isMain: boolean; sortOrder: number; }
interface Product360Asset { id: string; url: string; frameIndex: number; totalFrames: number; }
interface Review { id: string; rating: number; title?: string | null; content: string; createdAt: Date; user: { name?: string | null; image?: string | null; }; }

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  discount?: number | null;
  sku?: string | null;
  stock: number;
  isSoldOut: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isLimitedEdition: boolean;
  isPreOrder: boolean;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  weight?: number | null;
  material?: string | null;
  manufacturer?: string | null;
  edition?: string | null;
  releaseDate?: Date | null;
  viewerType: string;
  modelUrl?: string | null;
  rating: number;
  reviewCount: number;
  images: ProductImage[];
  assets360: Product360Asset[];
  character?: { name: string; slug: string; } | null;
  anime?: { name: string; slug: string; } | null;
  brand?: { name: string; slug: string; } | null;
  category?: { name: string; slug: string; } | null;
  reviews: Review[];
}

interface ProductPageClientProps {
  product: ProductData;
  related: { id: string; name: string; slug: string; price: number; compareAtPrice: number | null; images: { url: string; isMain: boolean }[] }[];
}

const tabs = ['Description', 'Specifications', 'Shipping', 'Reviews'];

export function ProductPageClient({ product, related }: ProductPageClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('Description');
  const [viewerMode, setViewerMode] = useState<'gallery' | '360' | '3d'>('gallery');
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const router = useRouter();
  const { requireAuth } = useRequireAuth();

  useEffect(() => {
    saveRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.images[0]?.url || '',
    });
  }, [product.id, product.name, product.slug, product.price, product.compareAtPrice, product.images]);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { toggleItem, isWishlisted } = useWishlistStore();
  const wishlisted = isWishlisted(product.id);

  const discount = calculateDiscount(product.price, product.compareAtPrice ?? 0);
  const isSoldOut = product.isSoldOut || product.stock === 0;
  const mainImages = product.images.length > 0
    ? product.images
    : [{ id: 'placeholder', url: '', alt: product.name, isMain: true, sortOrder: 0 }];

  const handleAddToCart = () => {
    if (isSoldOut) return;
    if (!requireAuth(undefined, `/product/${product.slug}`)) return;

    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: mainImages[0]?.url ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      stock: product.stock,
    });
    for (let i = 1; i < quantity; i++) {
      addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: mainImages[0]?.url ?? '',
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? undefined,
        stock: product.stock,
      });
    }
    toast.success('Added to cart!', { icon: '🛍️' });
    openCart();
  };

  const handleBuyNow = () => {
    if (isSoldOut) return;
    if (!requireAuth(undefined, '/checkout')) return;

    handleAddToCart();
    router.push('/checkout');
  };

  const handleWishlist = () => {
    toggleItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: mainImages[0]?.url ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
    });
    toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist!', {
      icon: wishlisted ? '💔' : '❤️',
    });
  };

  const stockStatus = isSoldOut
    ? { label: 'Sold Out', color: 'text-red-500' }
    : product.stock <= 5
    ? { label: `Only ${product.stock} left!`, color: 'text-orange-500' }
    : { label: 'In Stock', color: 'text-green-600' };

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="container-wide py-3 flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-brand-red transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-brand-red transition-colors">Shop</Link>
          {product.anime && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/anime/${product.anime.slug}`} className="hover:text-brand-red transition-colors">
                {product.anime.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      {/* Product Layout */}
      <div className="container-wide py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div className="space-y-4">
            {/* Viewer Mode Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewerMode('gallery')}
                className={cn('px-3 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-colors', viewerMode === 'gallery' ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-gray-400')}
              >
                Gallery
              </button>
              {product.assets360.length > 0 && (
                <button
                  onClick={() => setViewerMode('360')}
                  className={cn('px-3 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-colors', viewerMode === '360' ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-gray-400')}
                >
                  360° Spin
                </button>
              )}
              <button
                onClick={() => setViewerMode('3d')}
                className={cn('px-3 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-colors', viewerMode === '3d' ? 'bg-brand-red text-white border-brand-red' : 'border-gray-200 hover:border-gray-400')}
              >
                3D Model
              </button>
            </div>

            {/* Main Image */}
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
              {viewerMode === 'gallery' && mainImages[selectedImage]?.url ? (
                <Image
                  src={mainImages[selectedImage].url}
                  alt={mainImages[selectedImage].alt ?? product.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : viewerMode === 'gallery' ? (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="font-heading text-6xl text-gray-300 tracking-widest">OTV</span>
                </div>
              ) : viewerMode === '360' ? (
                <Viewer360 assets={product.assets360} productName={product.name} />
              ) : (
                <Model3DViewer modelUrl={product.modelUrl} productName={product.name} />
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {discount > 0 && <span className="badge-sale">{discount}% OFF</span>}
                {isSoldOut && <span className="badge-sold-out">SOLD OUT</span>}
                {product.isLimitedEdition && <span className="badge-limited">LIMITED</span>}
                {product.isPreOrder && <span className="badge-preorder">PRE-ORDER</span>}
              </div>
            </div>

            {/* Thumbnails */}
            {mainImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {mainImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => { setSelectedImage(i); setViewerMode('gallery'); }}
                    className={cn(
                      'w-16 h-16 flex-shrink-0 border-2 transition-colors overflow-hidden bg-gray-50',
                      i === selectedImage && viewerMode === 'gallery'
                        ? 'border-brand-red'
                        : 'border-gray-200 hover:border-gray-400'
                    )}
                  >
                    {img.url && (
                      <Image src={img.url} alt={img.alt ?? `Image ${i + 1}`} width={64} height={64} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {product.brand && (
                <Link href={`/shop?brand=${product.brand.slug}`} className="text-xs font-bold tracking-wider uppercase text-brand-red hover:underline">
                  {product.brand.name}
                </Link>
              )}
              {product.anime && (
                <span className="text-xs text-gray-400">/ {product.anime.name}</span>
              )}
            </div>

            {/* Name */}
            <h1 className="font-heading text-3xl sm:text-4xl tracking-wide uppercase leading-tight mb-3">
              {product.name}
            </h1>

            {/* Character */}
            {product.character && (
              <Link
                href={`/characters/${product.character.slug}`}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-red transition-colors mb-4"
              >
                Character: <span className="font-semibold">{product.character.name}</span>
              </Link>
            )}

            {/* Rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={cn('w-4 h-4', s <= Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200')} />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-brand-red">{formatPrice(product.price)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xl text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
              )}
              {discount > 0 && (
                <span className="text-sm font-bold text-green-600">{discount}% off</span>
              )}
            </div>

            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-gray-400 mb-4">SKU: {product.sku}</p>
            )}

            {/* Stock */}
            <p className={cn('text-sm font-semibold mb-6', stockStatus.color)}>
              ● {stockStatus.label}
            </p>

            {/* Quantity */}
            {!isSoldOut && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-200">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center text-sm font-semibold border-x border-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 mb-8">
              {isSoldOut ? (
                <div className="space-y-2">
                  <button disabled className="btn-dark w-full justify-center py-4 opacity-60 cursor-not-allowed">
                    SOLD OUT
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotifyOpen(true)}
                    className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-brand-red border-2 border-brand-red font-heading tracking-widest text-xs flex items-center justify-center gap-2 transition-colors uppercase font-bold"
                  >
                    <Bell className="w-4 h-4" />
                    NOTIFY ME WHEN RESTOCKED
                  </button>
                </div>
              ) : product.isPreOrder ? (
                <button onClick={handleAddToCart} className="btn-primary w-full justify-center py-4">
                  <ShoppingBag className="w-4 h-4" />
                  PRE-ORDER NOW
                </button>
              ) : (
                <>
                  <button onClick={handleAddToCart} className="btn-dark w-full justify-center py-4 text-base gap-3">
                    <ShoppingBag className="w-5 h-5" />
                    ADD TO BAG
                  </button>
                  <button onClick={handleBuyNow} className="btn-primary w-full justify-center py-4 text-base gap-3">
                    <Zap className="w-5 h-5" />
                    BUY NOW
                  </button>
                </>
              )}
              <button
                onClick={handleWishlist}
                className={cn(
                  'w-full py-3 border-2 flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase transition-all',
                  wishlisted
                    ? 'border-red-500 text-red-500 bg-red-50'
                    : 'border-gray-200 text-gray-700 hover:border-brand-red hover:text-brand-red'
                )}
              >
                <Heart className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} />
                {wishlisted ? 'WISHLISTED' : 'ADD TO WISHLIST'}
              </button>
            </div>

            {/* Trust Bar */}
            <div className="border-t border-gray-100 pt-6 space-y-3.5">
              {[
                { icon: ShieldCheck, title: '100% Authentic Import', desc: 'Direct from licensed Japanese manufacturers with official holographic seal.' },
                { icon: Package, title: 'Double-Boxed Collector Packaging', desc: 'Heavy-duty bubble wrap, foam corner guards, and rigid crush-resistant boxes.' },
                { icon: Award, title: '7-Day Transit Damage Guarantee', desc: 'Hassle-free replacement if damaged during shipping.' },
                { icon: Truck, title: 'Express Insured Delivery', desc: 'Real-time courier tracking via BlueDart, Delhivery & Shiprocket.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-red-50 text-brand-red flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block">{title}</span>
                    <span className="text-gray-500 text-[11px] leading-relaxed">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <div className="flex gap-0 border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-3 text-sm font-semibold tracking-wider whitespace-nowrap uppercase border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-brand-red text-brand-red'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                )}
              >
                {tab} {tab === 'Reviews' && product.reviewCount > 0 ? `(${product.reviewCount})` : ''}
              </button>
            ))}
          </div>

          <div className="py-6 max-w-3xl">
            {activeTab === 'Description' && (
              <div className="prose prose-sm max-w-none text-gray-700">
                {product.description ? (
                  <p className="leading-relaxed">{product.description}</p>
                ) : (
                  <p className="text-gray-400">No description available.</p>
                )}
              </div>
            )}

            {activeTab === 'Specifications' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Height', value: product.height ? `${product.height} cm` : null },
                  { label: 'Width', value: product.width ? `${product.width} cm` : null },
                  { label: 'Depth', value: product.depth ? `${product.depth} cm` : null },
                  { label: 'Weight', value: product.weight ? `${product.weight} g` : null },
                  { label: 'Material', value: product.material },
                  { label: 'Manufacturer', value: product.manufacturer },
                  { label: 'Edition', value: product.edition },
                  { label: 'SKU', value: product.sku },
                  { label: 'Release Date', value: product.releaseDate ? new Date(product.releaseDate).toLocaleDateString('en-IN') : null },
                ].filter((s) => s.value).map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500 font-medium">{label}</span>
                    <span className="text-sm text-gray-900 font-semibold text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Shipping' && (
              <div className="space-y-4 text-sm text-gray-700">
                <div className="p-4 bg-green-50 border border-green-100">
                  <p className="font-semibold text-green-800 mb-1">🚚 Free shipping on orders above ₹999</p>
                  <p className="text-green-700 text-xs">Standard shipping: 4–7 business days</p>
                </div>
                <p><strong>Standard Delivery:</strong> 4–7 business days (₹79)</p>
                <p><strong>Express Delivery:</strong> 2–3 business days (₹149)</p>
                <p><strong>Return Policy:</strong> 7-day return for damaged or defective products.</p>
                <p><strong>Packaging:</strong> All figures are packed in collector-grade boxes with foam protection.</p>
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div>
                {product.reviews.length === 0 ? (
                  <p className="text-gray-400 text-sm">No reviews yet. Be the first to review!</p>
                ) : (
                  <div className="space-y-6">
                    {product.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200')} />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        {review.title && <p className="font-semibold text-sm mb-1">{review.title}</p>}
                        <p className="text-sm text-gray-700">{review.content}</p>
                        <p className="text-xs text-gray-400 mt-2">— {review.user.name ?? 'Anonymous'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-12 border-t border-gray-100 pt-8">
            <h2 className="font-heading text-3xl tracking-wider uppercase mb-6">
              FROM THE SAME ANIME
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {related.map((r) => (
                <ProductCard
                  key={r.id}
                  product={{
                    id: r.id,
                    name: r.name,
                    slug: r.slug,
                    price: r.price,
                    compareAtPrice: r.compareAtPrice ?? undefined,
                    image: r.images[0]?.url,
                    stock: 10,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed Figures */}
        <RecentlyViewed currentSlug={product.slug} />

        {/* Back In Stock Lead Capture Modal */}
        <BackInStockModal
          isOpen={isNotifyOpen}
          onClose={() => setIsNotifyOpen(false)}
          productName={product.name}
          productSlug={product.slug}
        />
      </div>
    </div>
  );
}

// 360 Viewer Component
function Viewer360({ assets, productName }: { assets: Product360Asset[]; productName: string }) {
  const [frame, setFrame] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const total = assets.length;

  if (total === 0) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 5) {
      const newFrame = (frame + (diff > 0 ? 1 : -1) + total) % total;
      setFrame(newFrame);
      setStartX(e.clientX);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    if (Math.abs(diff) > 5) {
      const newFrame = (frame + (diff > 0 ? 1 : -1) + total) % total;
      setFrame(newFrame);
      setStartX(e.touches[0].clientX);
    }
  };

  return (
    <div
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      <Image
        src={assets[frame].url}
        alt={`${productName} — 360° frame ${frame + 1}`}
        fill
        className="object-contain pointer-events-none"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 text-white text-xs px-3 py-1.5">
        <RotateCcw className="w-3 h-3" />
        Drag to rotate • {frame + 1}/{total}
      </div>
    </div>
  );
}
