'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductCard, type ProductCardData } from '@/components/ProductCard/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCard/ProductCardSkeleton';

function SearchComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(q);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  const fetchResults = useCallback(async () => {
    if (!q) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      {/* Search Header */}
      <div className="bg-gray-50 border-b border-gray-100 py-8">
        <div className="container-wide">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-red mb-4 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
          <form onSubmit={handleSearch} className="flex gap-0 max-w-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for figures, characters, anime..."
              className="flex-1 px-5 py-4 border-2 border-gray-200 text-base outline-none focus:border-brand-red transition-colors bg-white"
              autoFocus
            />
            <button type="submit" className="btn-primary px-6 py-4 text-sm">
              <Search className="w-4 h-4" />
              SEARCH
            </button>
          </form>
        </div>
      </div>

      <div className="container-wide py-8">
        {q && (
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              {loading ? 'Searching...' : `${total} result${total !== 1 ? 's' : ''} for`}{' '}
              {!loading && <strong className="text-gray-900">&ldquo;{q}&rdquo;</strong>}
            </p>
          </div>
        )}

        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : q ? (
          <div className="py-16 text-center">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="font-heading text-2xl tracking-wider text-gray-400 mb-3">
              NO RESULTS FOUND
            </p>
            <p className="text-gray-500 text-sm mb-6">
              No figures match &ldquo;{q}&rdquo;. Try another franchise or character name.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse All Figures
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense
        fallback={
          <div className="container-wide py-12">
            <div className="h-14 bg-gray-100 animate-pulse mb-8 max-w-2xl" />
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <SearchComponent />
      </Suspense>
    </div>
  );
}
