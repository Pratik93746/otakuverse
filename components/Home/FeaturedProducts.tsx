import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { getProducts } from '@/lib/db/products';

async function getFeaturedProducts() {
  try {
    const res = await getProducts({ sort: 'featured', limit: 8 });
    return res.products || [];
  } catch (err) {
    console.warn('⚠️ [FeaturedProducts] Error fetching featured products:', err);
    return [];
  }
}

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  if (products.length === 0) return null;

  return (
    <section className="section-spacing relative overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      <div className="container-wide">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title text-left text-white">FEATURED FIGURES</h2>
            <div className="h-0.5 w-16 bg-brand-red mt-2" />
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-brand-red hover:gap-2 transition-all"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="product-grid">
          {products.map((product: any, i: number) => (
            <ProductCard
              key={product._id?.toString() || product.id || product.slug}
              priority={i < 4}
              product={{
                id: product._id?.toString() || product.id || product.slug,
                name: product.name,
                slug: product.slug,
                price: product.price,
                compareAtPrice: product.compareAtPrice ?? undefined,
                image: product.image || product.images?.[0]?.url || '',
                characterName: product.characterName,
                animeName: product.animeName,
                brandName: product.brandName ?? undefined,
                stock: product.stock,
                isSoldOut: product.isSoldOut || product.stock <= 0,
                isNewArrival: product.isNewArrival,
                isBestSeller: product.isBestSeller,
                isLimitedEdition: product.isLimitedEdition,
                isPreOrder: product.isPreOrder,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
