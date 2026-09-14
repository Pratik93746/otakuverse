import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard/ProductCard';
import { getProducts } from '@/lib/db/products';

async function getNewArrivals() {
  const res = await getProducts({ filter: 'new', limit: 8 });
  return res.products || [];
}

async function getBestSellers() {
  const res = await getProducts({ filter: 'bestsellers', limit: 8 });
  return res.products || [];
}

async function getBestDeals() {
  const res = await getProducts({ filter: 'sale', limit: 8 });
  return res.products || [];
}

function ProductSection({
  title,
  products,
  viewAllHref,
  bgColor = 'bg-[#0A0A0F]',
}: {
  title: string;
  products: any[];
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
              key={product._id?.toString() || product.id || product.slug}
              product={{
                id: product._id?.toString() || product.id || product.slug,
                name: product.name,
                slug: product.slug,
                price: product.price,
                compareAtPrice: product.compareAtPrice ?? undefined,
                image: product.image || product.images?.[0]?.url || '',
                characterName: product.characterName,
                animeName: product.animeName,
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
