'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  characterName?: string;
  animeName?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const popularSearches = [
  'Goku Ultra Instinct',
  'Naruto Hokage',
  'Luffy Gear 5',
  'Demon Slayer',
  'Jujutsu Kaisen',
  'Zoro Figure',
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setResults(data.products ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-[70] bg-white shadow-2xl"
          >
            {/* Search Input */}
            <form onSubmit={handleSubmit} className="container-wide py-4">
              <div className="flex items-center gap-3 border-b-2 border-gray-200 focus-within:border-brand-red transition-colors">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for figures, characters, anime..."
                  className="flex-1 py-3 text-lg outline-none placeholder:text-gray-400 font-medium bg-transparent"
                />
                {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Results Panel */}
            <div className="container-wide pb-6">
              {query.length >= 2 ? (
                results.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {results.map((product, idx) => (
                        <Link
                          key={product.id || (product as any)._id || product.slug || `res-${idx}`}
                          href={`/product/${product.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-14 h-14 bg-gray-100 flex-shrink-0 overflow-hidden">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-red transition-colors">
                              {product.name}
                            </p>
                            {product.animeName && (
                              <p className="text-xs text-gray-500 truncate">{product.animeName}</p>
                            )}
                            <p className="text-sm font-bold text-brand-red mt-0.5">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-red group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/search?q=${encodeURIComponent(query)}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-red hover:underline"
                    >
                      View all results for &quot;{query}&quot;
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                ) : !loading ? (
                  <div className="py-4">
                    <p className="text-gray-500 text-sm mb-4">
                      No results found for &quot;<strong>{query}</strong>&quot;
                    </p>
                    <p className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                      Popular searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((s) => (
                        <button
                          key={s}
                          onClick={() => setQuery(s)}
                          className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 hover:border-brand-red hover:text-brand-red transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              ) : (
                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">
                    Popular searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 hover:border-brand-red hover:text-brand-red transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
