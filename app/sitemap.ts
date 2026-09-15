import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/db/products';
import { ANIME_FRANCHISES } from '@/lib/mockProducts';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://otakuverse-black.vercel.app';
  const now = new Date();

  // 1. Static high-priority routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/anime`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/characters`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // 2. Anime Franchise hub routes
  const franchiseRoutes: MetadataRoute.Sitemap = Object.keys(ANIME_FRANCHISES).map((slug) => ({
    url: `${baseUrl}/anime/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 3. Dynamic Products catalog
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await getProducts({ limit: 1000 });
    const products = res.products || [];
    productRoutes = products.map((p) => ({
      url: `${baseUrl}/product/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch {
    // fallback gracefully
  }

  return [...staticRoutes, ...franchiseRoutes, ...productRoutes];
}
