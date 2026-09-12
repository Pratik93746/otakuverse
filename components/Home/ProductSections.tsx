import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { getAllCustomProductsAsync } from '@/lib/customProductsStore';

async function getNewArrivals() {
  const custom = await getAllCustomProductsAsync();
  const customNew = custom.filter((x) => x.isNewArrival);

  try {
    const p = await prisma.product.findMany({
      where: { isNewArrival: true, isPublished: true },
      include: {
        images: { where: { isMain: true }, take: 1 },
        character: true,
        anime: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const catalog = p.length > 0 ? p : (MOCK_PRODUCTS.filter((x) => x.isNewArrival).slice(0, 8) as any);
    return [...customNew, ...catalog].slice(0, 8);
  } catch {
    const catalog = MOCK_PRODUCTS.filter((x) => x.isNewArrival).slice(0, 8) as any;
    return [...customNew, ...catalog].slice(0, 8);
  }
}

async function getBestSellers() {
  const custom = await getAllCustomProductsAsync();
  const customBest = custom.filter((x) => x.isBestSeller);

  try {
    const p = await prisma.product.findMany({
      where: { isBestSeller: true, isPublished: true },
      include: {
        images: { where: { isMain: true }, take: 1 },
        character: true,
        anime: true,
      },
      orderBy: { salesCount: 'desc' },
      take: 8,
    });
    const catalog = p.length > 0 ? p : (MOCK_PRODUCTS.filter((x) => x.isBestSeller).slice(0, 8) as any);
    return [...customBest, ...catalog].slice(0, 8);
  } catch {
    const catalog = MOCK_PRODUCTS.filter((x) => x.isBestSeller).slice(0, 8) as any;
    return [...customBest, ...catalog].slice(0, 8);
  }
}

async function getBestDeals() {
  const custom = await getAllCustomProductsAsync();
  const customDeals = custom.filter((x) => (x.compareAtPrice ?? 0) > x.price);

  try {
    const p = await prisma.product.findMany({
      where: {
        isPublished: true,
        compareAtPrice: { not: null },
        discount: { gt: 10 },
      },
      include: {
        images: { where: { isMain: true }, take: 1 },
        character: true,
        anime: true,
      },
      orderBy: { discount: 'desc' },
      take: 8,
    });
    const catalog = p.length > 0 ? p : (MOCK_PRODUCTS.filter((x) => (x.compareAtPrice ?? 0) > x.price).slice(0, 8) as any);
    return [...customDeals, ...catalog].slice(0, 8);
  } catch {
    const catalog = MOCK_PRODUCTS.filter((x) => (x.compareAtPrice ?? 0) > x.price).slice(0, 8) as any;
    return [...customDeals, ...catalog].slice(0, 8);
  }
}

function ProductSection({
  title,
  products,
  viewAllHref,
  bgColor = 'bg-[#0A0A0F]',
}: {
  title: string;
  products: Awaited<ReturnType<typeof getNewArrivals>>;
  viewAllHref: string;
  bgColor?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className={`section-spacing ${bgColor}`}>
      <div className="container-wide">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title text-left text-white">{title}</h2>
            <div className="h-0.5 w-16 bg-brand-red mt-2" />
          </div>
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-brand-red hover:gap-2 transition-all"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((product: any) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                compareAtPrice: product.compareAtPrice ?? undefined,
                image: (product as any).images?.[0]?.url ?? (product as any).image ?? '',
                characterName: product.character?.name,
                animeName: product.anime?.name,
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

export async function NewArrivalsSection() {
  const products = await getNewArrivals();
  return (
    <ProductSection
      title="NEW ARRIVALS"
      products={products}
      viewAllHref="/shop?filter=new"
      bgColor="bg-[#0D0D14]"
    />
  );
}

export async function BestSellersSection() {
  const products = await getBestSellers();
  return (
    <ProductSection
      title="BEST SELLERS"
      products={products}
      viewAllHref="/shop?filter=bestsellers"
    />
  );
}

export async function BestDealsSection() {
  const products = await getBestDeals();
  return (
    <ProductSection
      title="ANIME BEST DEALS"
      products={products}
      viewAllHref="/shop?filter=sale"
      bgColor="bg-[#0D0D14]"
    />
  );
}
