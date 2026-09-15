'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Eye, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface RecentItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
}

export function saveRecentlyViewed(product: RecentItem) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('baka_recent_views');
    const list: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((p) => p.slug !== product.slug);
    const updated = [product, ...filtered].slice(0, 6);
    localStorage.setItem('baka_recent_views', JSON.stringify(updated));
  } catch {
    // non-blocking
  }
}

export function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('baka_recent_views');
      if (raw) {
        const parsed: RecentItem[] = JSON.parse(raw);
        setItems(parsed.filter((p) => p.slug !== currentSlug));
      }
    } catch {
      // non-blocking
    }
  }, [currentSlug]);

  if (items.length === 0) return null;

  return (
    <div className="mt-16 pt-10 border-t border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-red mb-1">
            <Eye className="w-3.5 h-3.5" /> RECENTLY VIEWED FIGURES
          </div>
          <h3 className="font-heading text-2xl tracking-wide uppercase">
            YOUR BROWSING ARCHIVE
          </h3>
        </div>
        <Link
          href="/shop"
          className="text-xs font-bold tracking-wider uppercase text-gray-500 hover:text-brand-red transition-colors flex items-center gap-1"
        >
          Explore All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/product/${item.slug}`}
            className="group block border border-gray-100 bg-white hover:border-brand-red transition-all p-2.5 shadow-2xs hover:shadow-sm"
          >
            <div className="aspect-square relative overflow-hidden bg-gray-50 mb-2">
              <Image
                src={item.image || '/catalog/dragon-ball/item-001.png'}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, 16vw"
              />
            </div>
            <h4 className="font-heading text-xs uppercase line-clamp-1 text-gray-800 group-hover:text-brand-red transition-colors">
              {item.name}
            </h4>
            <p className="text-xs font-bold text-gray-900 mt-1">
              {formatPrice(item.price)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
