import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { getFirestoreProducts } from '@/lib/firestore';
import { getStoredCustomProducts } from '@/lib/customProductsStore';
import { AdminProductsClient, AdminProductItem } from './AdminProductsClient';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/products" pageTitle="Figure & Inventory Management" />;
  }

  // 1. Fetch custom products from local store & Firestore safely
  const localProducts = getStoredCustomProducts();
  let fsProducts: any[] = [];
  try {
    fsProducts = await getFirestoreProducts();
  } catch (err) {
    console.warn('⚠️ [AdminProductsPage] Firestore fetch notice:', err);
  }

  const customMap = new Map();
  [...localProducts, ...fsProducts].forEach((p) => {
    customMap.set(p.id || p.slug, p);
  });
  const customProducts = Array.from(customMap.values());

  // 2. Prisma products (fast check, fallback immediately if offline)
  let prismaProducts: any[] = [];
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
    try {
      const fetchPrisma = prisma.product.findMany({
        include: {
          images: { where: { isMain: true }, take: 1 },
          anime: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      const timeout = new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 400));
      prismaProducts = await Promise.race([fetchPrisma, timeout]);
    } catch {
      // postgres offline, proceed with catalog
    }
  }

  const mappedPrisma: AdminProductItem[] = prismaProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    discount: p.discount,
    image: p.images?.[0]?.url || '/catalog/dragon-ball/item-001.png',
    characterName: p.characterName,
    animeName: p.anime?.name,
    animeSlug: p.anime?.slug,
    brandName: p.brand?.name,
    categoryName: p.category?.name,
    stock: p.stock,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    isLimitedEdition: p.isLimitedEdition,
    isPreOrder: p.isPreOrder,
    isCustom: false,
    sku: p.sku,
  }));

  const mappedCustom: AdminProductItem[] = customProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    discount: p.discount,
    image: p.image || '/catalog/dragon-ball/item-001.png',
    characterName: p.characterName,
    animeName: p.animeName,
    animeSlug: p.animeSlug,
    brandName: p.brandName,
    categoryName: p.categoryName,
    stock: p.stock,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    isLimitedEdition: p.isLimitedEdition,
    isPreOrder: p.isPreOrder,
    isCustom: true,
    sku: p.id ? `OTV-CUSTOM-${p.id.slice(-4).toUpperCase()}` : undefined,
  }));

  const { getRemovedProductIds, getProductOverrides } = await import('@/lib/customProductsStore');
  const removedIds = getRemovedProductIds();
  const overrides = getProductOverrides();

  const catalogFallback: AdminProductItem[] = MOCK_PRODUCTS.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    price: m.price,
    compareAtPrice: m.compareAtPrice,
    discount: m.discount,
    image: m.image,
    characterName: m.characterName,
    animeName: m.animeName,
    animeSlug: m.animeSlug,
    brandName: m.brandName,
    categoryName: m.categoryName,
    stock: m.stock,
    isNewArrival: m.isNewArrival,
    isBestSeller: m.isBestSeller,
    isLimitedEdition: m.isLimitedEdition,
    isPreOrder: m.isPreOrder,
    isCustom: false,
    sku: `OTV-${m.slug.slice(0, 6).toUpperCase()}`,
  }));

  const initialProducts: AdminProductItem[] = [
    ...mappedCustom,
    ...(mappedPrisma.length > 0 ? mappedPrisma : catalogFallback),
  ]
    .filter((p) => !removedIds.includes(p.id) && !removedIds.includes(p.slug))
    .map((p) => {
      const customStock = overrides[p.id]?.stock ?? overrides[p.slug]?.stock;
      return customStock !== undefined ? { ...p, stock: customStock } : p;
    });

  return <AdminProductsClient initialProducts={initialProducts} />;
}
