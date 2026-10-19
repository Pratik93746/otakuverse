import { Suspense } from 'react';
import {
  HeroSection,
  TrendingSection,
  GamingSection,
  TrustFeatures,
  CategoriesSection,
  ThemeSection,
  FeaturedProducts,
} from '@/components/Home';
import { ProductCardSkeleton } from '@/components/ProductCard/ProductCardSkeleton';

// Re-read prices, stock and visibility from the database at most once a minute.
export const revalidate = 60;

export default function HomePage() {
  return (
    <div>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Nowadays Trending (Spider-Man & Hot Drops) */}
      <TrendingSection />

      {/* 3. Trust Features */}
      <TrustFeatures />

      {/* 4. Categories */}
      <CategoriesSection />

      {/* 5. Shop by Theme */}
      <ThemeSection />

      {/* 6. Gaming Mood (Sekiro & Hardcore RPG Drops) */}
      <GamingSection />

      {/* 7. Featured Products */}
      <Suspense
        fallback={
          <div className="section-spacing container-wide">
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <FeaturedProducts />
      </Suspense>
    </div>
  );
}
