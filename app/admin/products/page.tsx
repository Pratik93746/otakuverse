import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllProductsAdmin } from '@/lib/db/products';
import { AdminProductsClient, AdminProductItem } from './AdminProductsClient';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/products" pageTitle="Figure & Inventory Management" />;
  }

  let dbProducts: any[] = [];
  try {
    dbProducts = await getAllProductsAdmin();
  } catch (err) {
    console.error('Failed to fetch admin products from MongoDB:', err);
  }

  const initialProducts: AdminProductItem[] = dbProducts.map((p) => ({
    id: p._id?.toString() || p.slug,
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
    sku: `OTV-${p.slug?.slice(0, 6).toUpperCase()}`,
  }));

  return <AdminProductsClient initialProducts={initialProducts} />;
}
