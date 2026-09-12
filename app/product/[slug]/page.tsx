import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ProductPageClient } from './ProductPageClient';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { getFirestoreProducts } from '@/lib/firestore';
import { getStoredCustomProducts } from '@/lib/customProductsStore';

interface Props {
  params: Promise<{ slug: string }> | { slug: string };
}

async function getProduct(slug: string) {
  const { getRemovedProductIds, getProductOverrides } = await import('@/lib/customProductsStore');
  const removedIds = getRemovedProductIds();
  if (removedIds.includes(slug)) return null;
  const overrides = getProductOverrides();

  try {
    const p = await prisma.product.findUnique({
      where: { slug, isPublished: true },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        assets360: { orderBy: { frameIndex: 'asc' } },
        character: true,
        anime: true,
        brand: true,
        category: true,
        reviews: {
          where: { isPublished: true },
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (p) {
      const stock = overrides[p.id]?.stock ?? overrides[p.slug]?.stock ?? p.stock;
      return { ...p, stock, isSoldOut: stock <= 0 };
    }
  } catch {
    // database offline fallback
  }

  // Check custom products from persistent store & Firestore
  try {
    const localProducts = getStoredCustomProducts();
    let fsProducts: any[] = [];
    try {
      fsProducts = await getFirestoreProducts();
    } catch {
      // ignore
    }
    const allCustom = [...localProducts, ...fsProducts];
    const custom = allCustom.find((p) => p.slug === slug || p.id === slug);
    if (custom) {
      return {
        ...custom,
        description: custom.description ?? `Official authentic ${custom.name} anime collectible sculpted with premium grade PVC details.`,
        sku: `OTV-CUSTOM-${custom.slug.slice(0, 6).toUpperCase()}-101`,
        height: 28,
        width: 14,
        depth: 12,
        weight: 750,
        material: 'PVC + ABS',
        manufacturer: custom.brandName ?? 'OTAKUVERSE Exclusive',
        edition: custom.isLimitedEdition ? 'Limited Masterpiece Edition' : 'First Edition Authentic Release',
        releaseDate: new Date(),
        viewerType: 'HYBRID',
        modelUrl: '/models/anime_figure.glb',
        isSoldOut: custom.stock <= 0,
        isNewArrival: custom.isNewArrival ?? true,
        isBestSeller: custom.isBestSeller ?? false,
        isLimitedEdition: custom.isLimitedEdition ?? false,
        isPreOrder: custom.isPreOrder ?? false,
        images: custom.images?.length
          ? custom.images.map((url: string, i: number) => ({ id: `img-${i}`, url, alt: custom.name, isMain: i === 0, sortOrder: i }))
          : [{ id: 'img-1', url: custom.image, alt: custom.name, isMain: true, sortOrder: 0 }],
        assets360: [],
        character: custom.characterName ? { name: custom.characterName, slug: custom.characterName.toLowerCase().replace(/\s+/g, '-') } : null,
        anime: custom.animeName ? { name: custom.animeName, slug: custom.animeSlug ?? custom.animeName.toLowerCase().replace(/\s+/g, '-') } : null,
        brand: custom.brandName ? { name: custom.brandName, slug: custom.brandName.toLowerCase().replace(/\s+/g, '-') } : null,
        category: custom.categoryName ? { name: custom.categoryName, slug: custom.categorySlug ?? 'figures' } : null,
        reviews: [
          {
            id: 'rev-1',
            rating: 5,
            title: 'Incredible detail and packaging!',
            content: 'Arrived in mint condition. The sculpt and paint job exceeded my expectations.',
            createdAt: new Date(),
            user: { name: 'Collector Prime', image: null },
          },
        ],
      };
    }
  } catch {
    // Firestore error fallback
  }

  // Fallback to mock product
  const mock = MOCK_PRODUCTS.find((m) => m.slug === slug);
  if (!mock) return null;

  return {
    ...mock,
    description: mock.description ?? 'Official authentic anime collectible figure sculpted with high grade PVC and vivid paintwork.',
    sku: `OTV-${mock.slug.slice(0, 6).toUpperCase()}-101`,
    height: 28,
    width: 14,
    depth: 12,
    weight: 750,
    material: 'PVC + ABS',
    manufacturer: mock.brandName ?? 'Banpresto',
    edition: 'Standard First Edition',
    releaseDate: new Date(),
    stock: overrides[mock.id]?.stock ?? overrides[mock.slug]?.stock ?? mock.stock,
    isSoldOut: (overrides[mock.id]?.stock ?? overrides[mock.slug]?.stock ?? mock.stock) <= 0,
    isNewArrival: mock.isNewArrival ?? false,
    isBestSeller: mock.isBestSeller ?? false,
    isLimitedEdition: mock.isLimitedEdition ?? false,
    isPreOrder: mock.isPreOrder ?? false,
    images: [{ id: 'img-1', url: mock.image, alt: mock.name, isMain: true, sortOrder: 0 }],
    assets360: [],
    character: mock.characterName ? { name: mock.characterName, slug: mock.characterName.toLowerCase().replace(/\s+/g, '-') } : null,
    anime: mock.animeName ? { name: mock.animeName, slug: mock.animeSlug ?? mock.animeName.toLowerCase().replace(/\s+/g, '-') } : null,
    brand: mock.brandName ? { name: mock.brandName, slug: mock.brandName.toLowerCase().replace(/\s+/g, '-') } : null,
    category: mock.categoryName ? { name: mock.categoryName, slug: mock.categorySlug ?? 'figures' } : null,
    reviews: [
      {
        id: 'rev-1',
        rating: 5,
        title: 'Incredible detail and packaging!',
        content: 'Arrived in mint condition. The sculpt and paint job exceeded my expectations.',
        createdAt: new Date(),
        user: { name: 'Collector Prime', image: null },
      },
    ],
  };
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
    if ((product as any).animeId) {
      related = await prisma.product.findMany({
        where: {
          animeId: (product as any).animeId,
          id: { not: product.id },
          isPublished: true,
        },
        include: { images: { where: { isMain: true }, take: 1 } },
        take: 6,
      });
    }
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
