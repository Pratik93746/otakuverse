import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { getAllCustomProductsAsync } from '@/lib/customProductsStore';

async function getFeaturedProducts() {
  const custom = await getAllCustomProductsAsync();

  try {
    const products = await prisma.product.findMany({
      where: { isFeatured: true, isPublished: true },
      include: {
        images: { where: { isMain: true }, take: 1 },
        character: true,
        anime: true,
        brand: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const catalog = products.length > 0 ? products : (MOCK_PRODUCTS.slice(0, 8) as any);
    return [...custom, ...catalog].slice(0, 8);
  } catch {
    const catalog = MOCK_PRODUCTS.slice(0, 8) as any;
    return [...custom, ...catalog].slice(0, 8);
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
              key={product.id}
              priority={i < 4}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                compareAtPrice: product.compareAtPrice ?? undefined,
                image: (product as any).images?.[0]?.url ?? (product as any).image ?? '',
                characterName: product.character?.name,
                animeName: product.anime?.name,
                brandName: product.brand?.name ?? undefined,
                stock: product.stock,
                isSoldOut: product.isSoldOut || product.stock === 0,
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
