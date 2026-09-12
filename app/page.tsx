import { Suspense } from 'react';
import {
  HeroSection,
  PromoBanner,
  TrendingSection,
  GamingSection,
  TrustFeatures,
  CategoriesSection,
  ThemeSection,
  FeaturedProducts,
  BestDealsSection,
  NewArrivalsSection,
  BestSellersSection,
  LimitedEditionSection,
  BrandsSection,
  TestimonialsSection,
} from '@/components/Home';
import { ProductCardSkeleton } from '@/components/ProductCard/ProductCardSkeleton';

export default function HomePage() {
  return (
    <div>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Marquee Ticker & Hot Drop */}
      <PromoBanner />

      {/* 3. Nowadays Trending (Spider-Man & Hot Drops) */}
      <TrendingSection />

      {/* 4. Trust Features */}
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

      {/* 7. Anime Best Deals */}
      <Suspense fallback={<div className="h-64" />}>
        <BestDealsSection />
      </Suspense>

      {/* 8. New Arrivals */}
      <Suspense fallback={<div className="h-64" />}>
        <NewArrivalsSection />
      </Suspense>

      {/* 9. Best Sellers */}
      <Suspense fallback={<div className="h-64" />}>
        <BestSellersSection />
      </Suspense>

      {/* 10. Limited Edition */}
      <Suspense fallback={<div className="h-64" />}>
        <LimitedEditionSection />
      </Suspense>

      {/* 11. Brands */}
      <BrandsSection />

      {/* 12. Testimonials */}
      <TestimonialsSection />
    </div>
  );
}
