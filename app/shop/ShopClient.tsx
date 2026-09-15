'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Grid3X3, Grid2X2, X, ChevronDown, Sparkles } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/ProductCard/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCard/ProductCardSkeleton';
import { cn } from '@/lib/utils';

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'rating', label: 'Highest Rated' },
];

const categoryOptions = [
  { slug: '', label: 'All Products', emoji: '🔥' },
  { slug: 'figures', label: 'Figures', emoji: '🥷' },
  { slug: 'katanas', label: 'Katanas', emoji: '🗡️' },
  { slug: 'keychains', label: 'Keychains', emoji: '🗝️' },
  { slug: 'clothing', label: 'Clothing', emoji: '🥋' },
  { slug: 'collectables', label: 'Collectables', emoji: '💎' },
  { slug: 'limited-editions', label: 'Limited Editions', emoji: '⭐' },
];

const animeOptions = [
  'Dragon Ball', 'Naruto', 'One Piece', 'Demon Slayer',
  'Jujutsu Kaisen', 'Bleach', 'My Hero Academia', 'Chainsaw Man',
  'Attack on Titan', 'Sword Art Online',
];

const priceRanges = [
  { label: 'Under ₹1,500', min: '0', max: '1500' },
  { label: '₹1,500 – ₹3,500', min: '1500', max: '3500' },
  { label: '₹3,500 – ₹6,000', min: '3500', max: '6000' },
  { label: '₹6,000 – ₹12,000', min: '6000', max: '12000' },
  { label: 'Above ₹12,000', min: '12000', max: '' },
];

interface ShopClientProps {
  initialFilter?: string;
  initialCategory?: string;
  initialAnime?: string;
}

export default function ShopClient({ initialFilter, initialCategory, initialAnime }: ShopClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [columns, setColumns] = useState<2 | 4>(4);

  const page = parseInt(searchParams.get('page') ?? '1');
  const sort = searchParams.get('sort') ?? 'featured';
  const filter = searchParams.get('filter') ?? initialFilter ?? '';
  const category = searchParams.get('category') ?? initialCategory ?? '';
  const anime = searchParams.get('anime') ?? initialAnime ?? '';
  const brand = searchParams.get('brand') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const inStock = searchParams.get('inStock') === 'true';
  const q = searchParams.get('q') ?? '';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (sort) params.set('sort', sort);
    if (filter) params.set('filter', filter);
    if (category) params.set('category', category);
    if (anime) params.set('anime', anime);
    if (brand) params.set('brand', brand);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStock) params.set('inStock', 'true');
    if (q) params.set('q', q);

    try {
      const res = await fetch(`/api/products?${params.toString()}&limit=24`);
      const data = await res.json();
      const loaded = (data.products ?? []).map((p: any) => ({
        ...p,
        id: p.id || p._id || p.slug,
      }));
      setProducts(loaded);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, filter, category, anime, brand, minPrice, maxPrice, inStock, q]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => router.push(pathname);

  const activeFiltersCount = [filter, category, anime, brand, minPrice, inStock ? 'stock' : ''].filter(Boolean).length;

  const currentCategoryObj = categoryOptions.find(c => c.slug === category);
  const pageTitle =
    filter === 'new' ? 'NEW ARRIVALS'
    : filter === 'bestsellers' ? 'BEST SELLERS'
    : filter === 'limited' ? 'LIMITED EDITION'
    : filter === 'sale' ? 'SALE COLLECTION'
    : category ? (currentCategoryObj ? `${currentCategoryObj.label.toUpperCase()}` : category.replace(/-/g, ' ').toUpperCase())
    : anime ? `${anime.replace(/-/g, ' ').toUpperCase()} COLLECTION`
    : q ? `SEARCH: "${q}"`
    : 'SHOP ALL FIGURES';

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-gradient-to-b from-[#0A0A0F] to-[#12111A] text-white py-10 md:py-14 border-b border-white/[0.08] relative overflow-hidden">
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(230, 51, 41, 0.25) 0%, transparent 70%)',
          }}
        />

        <div className="container-wide relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/15 border border-red-600/40 text-red-400 text-xs font-black tracking-[0.2em] uppercase mb-3 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            OFFICIAL AUTHENTIC CATALOG
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl tracking-widest uppercase font-black">
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {loading ? 'Curating catalog...' : `${total} figures & statues available in this collection`}
          </p>

          {/* Quick Category Switcher Pills */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-none">
            {categoryOptions.map((cat) => {
              const isActive = (category === cat.slug) || (!category && cat.slug === '');
              return (
                <button
                  key={cat.slug}
                  onClick={() => updateParam('category', cat.slug)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 border',
                    isActive
                      ? 'bg-brand-red text-white border-brand-red shadow-lg shadow-red-500/20'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30 hover:bg-white/10'
                  )}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container-wide py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-medium hover:border-brand-red transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-brand-red text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-red transition-colors"
              >
                Clear all <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Grid toggle */}
            <div className="hidden md:flex items-center gap-1 border border-gray-200 p-1">
              <button
                onClick={() => setColumns(4)}
                className={cn('p-1.5 transition-colors', columns === 4 ? 'bg-gray-900 text-white' : 'hover:bg-gray-100')}
                aria-label="4 columns"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setColumns(2)}
                className={cn('p-1.5 transition-colors', columns === 2 ? 'bg-gray-900 text-white' : 'hover:bg-gray-100')}
                aria-label="2 columns"
              >
                <Grid2X2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="appearance-none border border-gray-200 px-4 py-2 pr-8 text-sm font-medium bg-white outline-none hover:border-brand-red transition-colors cursor-pointer"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {(filter || category || anime || minPrice) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {category && (
              <button
                onClick={() => updateParam('category', '')}
                className="flex items-center gap-1 px-3 py-1 bg-brand-red text-white text-xs font-medium hover:bg-brand-red-dark transition-colors"
              >
                Category: {currentCategoryObj?.label ?? category} <X className="w-3 h-3" />
              </button>
            )}
            {filter && (
              <button
                onClick={() => updateParam('filter', '')}
                className="flex items-center gap-1 px-3 py-1 bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                Tag: {filter} <X className="w-3 h-3" />
              </button>
            )}
            {anime && (
              <button
                onClick={() => updateParam('anime', '')}
                className="flex items-center gap-1 px-3 py-1 bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                Franchise: {anime} <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className={cn(
            'grid gap-3 md:gap-4',
            columns === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-2'
          )}>
            {Array.from({ length: 24 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-heading text-3xl text-gray-300 tracking-wider mb-3">
              NO FIGURES FOUND
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Try adjusting your filters or browse all products.
            </p>
            <button onClick={clearFilters} className="btn-primary">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={cn(
            'grid gap-3 md:gap-4',
            columns === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-2'
          )}>
            {products.map((product, idx) => {
              const itemKey = product.id || (product as any)._id || product.slug || `shop-prod-${idx}`;
              return <ProductCard key={itemKey} product={product} />;
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => updateParam('page', String(p))}
                className={cn(
                  'w-9 h-9 text-sm font-semibold border transition-colors',
                  p === page
                    ? 'bg-brand-red text-white border-brand-red'
                    : 'border-gray-200 hover:border-brand-red hover:text-brand-red'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b">
                <span className="font-heading text-xl tracking-wider">FILTERS</span>
                <button onClick={() => setFilterOpen(false)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Categories */}
                <div>
                  <p className="font-semibold text-xs tracking-widest uppercase mb-3">Categories</p>
                  <div className="space-y-1">
                    {categoryOptions.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => {
                          updateParam('category', c.slug);
                          setFilterOpen(false);
                        }}
                        className={cn(
                          'w-full text-left text-sm px-3 py-2 flex items-center justify-between transition-colors',
                          category === c.slug
                            ? 'bg-brand-red text-white font-bold'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span>{c.emoji}</span>
                          <span>{c.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <p className="font-semibold text-xs tracking-widest uppercase mb-3">Availability</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                      className="accent-brand-red"
                    />
                    <span className="text-sm">In Stock Only</span>
                  </label>
                </div>

                {/* Price Range */}
                <div>
                  <p className="font-semibold text-xs tracking-widest uppercase mb-3">Price Range</p>
                  <div className="space-y-2">
                    {priceRanges.map((r) => (
                      <button
                        key={r.label}
                        onClick={() => {
                          updateParam('minPrice', r.min);
                          updateParam('maxPrice', r.max);
                        }}
                        className={cn(
                          'w-full text-left text-sm px-3 py-2 border transition-colors',
                          minPrice === r.min && maxPrice === r.max
                            ? 'border-brand-red text-brand-red bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anime */}
                <div>
                  <p className="font-semibold text-xs tracking-widest uppercase mb-3">Anime Franchises</p>
                  <div className="space-y-1">
                    {animeOptions.map((a) => {
                      const aSlug = a.toLowerCase().replace(/\s+/g, '-');
                      return (
                        <button
                          key={a}
                          onClick={() => {
                            updateParam('anime', aSlug);
                            setFilterOpen(false);
                          }}
                          className={cn(
                            'w-full text-left text-sm px-3 py-2 transition-colors',
                            anime === aSlug
                              ? 'bg-brand-red text-white font-bold'
                              : 'hover:bg-gray-50'
                          )}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t">
                <button
                  onClick={() => { clearFilters(); setFilterOpen(false); }}
                  className="btn-secondary w-full justify-center"
                >
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
