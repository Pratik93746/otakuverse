import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductPageClient } from './ProductPageClient';
import { getProductByIdOrSlug, getProducts } from '@/lib/db/products';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

async function getProduct(slug: string) {
  try {
    const p = await getProductByIdOrSlug(slug);
    if (!p) return null;

    return {
      ...p,
      id: p._id?.toString() || p.slug,
      description:
        p.description ??
        `Official authentic ${p.name} anime collectible sculpted with premium grade PVC details.`,
      sku: `OTV-${p.slug.slice(0, 6).toUpperCase()}-101`,
      height: 28,
      width: 14,
      depth: 12,
      weight: 750,
      material: 'PVC + ABS',
      manufacturer: p.brandName ?? 'OTAKUVERSE Exclusive',
      edition: p.isLimitedEdition
        ? 'Limited Masterpiece Edition'
        : 'First Edition Authentic Release',
      releaseDate: p.createdAt || new Date(),
      viewerType: 'HYBRID',
      modelUrl: '/models/anime_figure.glb',
      isSoldOut: p.stock <= 0,
      isNewArrival: p.isNewArrival ?? false,
      isBestSeller: p.isBestSeller ?? false,
      isLimitedEdition: p.isLimitedEdition ?? false,
      isPreOrder: p.isPreOrder ?? false,
      images: p.images?.length
        ? p.images.map((url: string, i: number) => ({
            id: `img-${i}`,
            url,
            alt: p.name,
            isMain: i === 0,
            sortOrder: i,
          }))
        : [{ id: 'img-1', url: p.image, alt: p.name, isMain: true, sortOrder: 0 }],
      assets360: [],
      character: p.characterName
        ? {
            name: p.characterName,
            slug: p.characterName.toLowerCase().replace(/\s+/g, '-'),
          }
        : null,
      anime: p.animeName
        ? {
            name: p.animeName,
            slug: p.animeSlug ?? p.animeName.toLowerCase().replace(/\s+/g, '-'),
          }
        : null,
      brand: p.brandName
        ? {
            name: p.brandName,
            slug: p.brandName.toLowerCase().replace(/\s+/g, '-'),
          }
        : null,
      category: p.categoryName
        ? {
            name: p.categoryName,
            slug: p.categorySlug ?? 'figures',
          }
        : null,
      reviews: [
        {
          id: 'rev-1',
          rating: 5,
          title: 'Incredible detail and packaging!',
          content:
            'Arrived in mint condition. The sculpt and paint job exceeded my expectations.',
          createdAt: new Date(),
          user: { name: 'Collector Prime', image: null },
        },
      ],
    };
  } catch (err) {
    console.error('MongoDB product detail fetch error:', err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const product = await getProduct(resolvedParams.slug);
  if (!product) return { title: 'Product Not Found | OTAKUVERSE' };

  const mainImage = (product as any).images?.[0]?.url ?? (product as any).image;

  return {
    title: (product as any).seoTitle ?? `${product.name} | OTAKUVERSE`,
    description:
      (product as any).seoDescription ??
      product.description?.slice(0, 160) ??
      `Buy ${product.name} from OTAKUVERSE`,
    openGraph: {
      title: product.name,
      description: product.description ?? '',
      images: mainImage ? [{ url: mainImage, alt: product.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const product = await getProduct(resolvedParams.slug);
  if (!product) notFound();

  // Related products
  let related: { id: string; name: string; slug: string; price: number; compareAtPrice: number | null; images: { url: string; isMain: boolean }[] }[] = [];
  try {
    const res = await getProducts({ limit: 12 });
    const allDb = res.products || [];
    const matches = allDb.filter((p: any) => p.slug !== product.slug && ((p.series && p.series === (product as any).series) || (p.category && p.category === (product as any).category)));
    const candidates = matches.length > 0 ? matches : allDb.filter((p: any) => p.slug !== product.slug);
    related = candidates.slice(0, 6).map((p: any) => ({
      id: p._id?.toString() || p.slug,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      images: p.images?.length ? p.images.map((img: any, i: number) => ({ url: typeof img === 'string' ? img : img.url, isMain: i === 0 })) : [{ url: p.image || '/placeholder.png', isMain: true }],
    }));
  } catch {
    // fallback
  }

  if (related.length === 0) {
    related = MOCK_PRODUCTS.filter((m) => m.slug !== product.slug)
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        price: m.price,
        compareAtPrice: m.compareAtPrice ?? null,
        images: [{ url: m.image, isMain: true }],
      }));
  }

  return <ProductPageClient product={product as any} related={related} />;
}
