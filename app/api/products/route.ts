import { NextRequest, NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { getFirestoreProducts } from '@/lib/firestore';
import { getStoredCustomProducts } from '@/lib/customProductsStore';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(48, parseInt(sp.get('limit') ?? '24'));
  const skip = (page - 1) * limit;

  // Filters
  const filter = sp.get('filter'); // new, bestsellers, limited, sale
  const category = sp.get('category');
  const anime = sp.get('anime');
  const brand = sp.get('brand');
  const character = sp.get('character');
  const minPrice = sp.get('minPrice');
  const maxPrice = sp.get('maxPrice');
  const search = sp.get('q');
  const sort = sp.get('sort') ?? 'featured';
  const inStock = sp.get('inStock') === 'true';

  const localProducts = getStoredCustomProducts();
  let fsProducts: any[] = [];
  try {
    fsProducts = await getFirestoreProducts();
  } catch {
    // ignore
  }

  const { getRemovedProductIds, getProductOverrides } = await import('@/lib/customProductsStore');
  const removedIds = getRemovedProductIds();
  const overrides = getProductOverrides();

  const customMap = new Map();
  [...localProducts, ...fsProducts].forEach((p) => {
    customMap.set(p.id || p.slug, p);
  });
  const customProducts = Array.from(customMap.values());

  let filtered: any[] = [...customProducts, ...MOCK_PRODUCTS]
    .filter((p) => !removedIds.includes(p.id) && !removedIds.includes(p.slug))
    .map((p) => {
      const stock = overrides[p.id]?.stock ?? overrides[p.slug]?.stock;
      return stock !== undefined ? { ...p, stock, isSoldOut: stock <= 0 } : p;
    });

  // Preset Filters
  if (filter === 'new') filtered = filtered.filter((p) => p.isNewArrival);
  if (filter === 'bestsellers') filtered = filtered.filter((p) => p.isBestSeller);
  if (filter === 'limited') filtered = filtered.filter((p) => p.isLimitedEdition);
  if (filter === 'sale') filtered = filtered.filter((p) => (p.compareAtPrice ?? 0) > p.price);

  // Category Filter
  if (category) {
    const catClean = category.toLowerCase().replace(/s$/, '').replace(/-/g, ' ');
    filtered = filtered.filter((p) => {
      const pSlug = (p.categorySlug || '').toLowerCase().replace(/s$/, '').replace(/-/g, ' ');
      const pName = (p.categoryName || '').toLowerCase();
      return pSlug.includes(catClean) || catClean.includes(pSlug) || pName.includes(catClean) || (category.includes('limited') && p.isLimitedEdition);
    });
  }

  // Anime Franchise Filter
  if (anime) {
    const animeClean = anime.toLowerCase().replace(/-/g, ' ');
    filtered = filtered.filter((p) => {
      const aSlug = (p.animeSlug || '').toLowerCase().replace(/-/g, ' ');
      const aName = (p.animeName || '').toLowerCase();
      return aSlug.includes(animeClean) || animeClean.includes(aSlug) || aName.includes(animeClean);
    });
  }

  // Brand Filter
  if (brand) {
    filtered = filtered.filter((p) => p.brandName?.toLowerCase().includes(brand.toLowerCase()));
  }

  // Character Filter
  if (character) {
    const charClean = character.toLowerCase().replace(/-/g, ' ');
    filtered = filtered.filter((p) => {
      const cName = (p.characterName || '').toLowerCase();
      return cName.includes(charClean) || charClean.includes(cName);
    });
  }

  // Search Filter
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.characterName?.toLowerCase() ?? '').includes(q) ||
      (p.animeName?.toLowerCase() ?? '').includes(q) ||
      (p.categoryName?.toLowerCase() ?? '').includes(q)
    );
  }

  // Stock Filter
  if (inStock) {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  // Price Filters
  if (minPrice) filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
  if (maxPrice) filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));

  // Custom product prioritization helper
  const isCustomProduct = (p: any) => {
    return p.createdAt && !p.id?.startsWith('prod-') ? 1 : 0;
  };

  // Sorting
  if (sort === 'newest') {
    filtered.sort((a, b) => {
      const aCustom = isCustomProduct(a);
      const bCustom = isCustomProduct(b);
      if (aCustom !== bCustom) return bCustom - aCustom;
      return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
    });
  } else if (sort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === 'bestselling') {
    filtered.sort((a, b) => {
      const aCustom = isCustomProduct(a);
      const bCustom = isCustomProduct(b);
      if (aCustom !== bCustom && (a.isBestSeller || b.isBestSeller)) return bCustom - aCustom;
      return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
    });
  } else if (sort === 'rating') {
    filtered.sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5));
  } else {
    filtered.sort((a, b) => {
      const aCustom = isCustomProduct(a);
      const bCustom = isCustomProduct(b);
      if (aCustom !== bCustom) return bCustom - aCustom;
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }

  const paginated = filtered.slice(skip, skip + limit);

  return NextResponse.json({
    products: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}
