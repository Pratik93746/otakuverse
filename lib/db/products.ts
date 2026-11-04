import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbProduct } from './types';
import { ObjectId } from 'mongodb';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { normalizeImageUrl } from '@/lib/utils';

/**
 * The built-in demo catalogue (lib/mockProducts.ts) exists for local development and tests only.
 * In production the database is the single source of truth: a removed, hidden or repriced product
 * must never reappear from static data, and a database outage must surface as an error instead
 * of silently serving (and selling) stale demo products.
 */
export function demoCatalogAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** Products are visible unless the owner explicitly hid them (absent flag = published). */
export const PUBLISHED_FILTER = { isPublished: { $ne: false } } as const;

export async function getProductsCollection() {
  await ensureIndexes();
  return await getCollection<DbProduct>('products');
}

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  filter?: string; // new, bestsellers, limited, sale, preorder
  category?: string;
  anime?: string;
  brand?: string;
  character?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string; // featured, newest, price-asc, price-desc, bestselling, rating
  inStock?: boolean;
}

export async function getProducts(options: ProductQueryOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 24));
  const skip = (page - 1) * limit;

  try {
    const col = await getProductsCollection();
    const mongoFilter: any = { ...PUBLISHED_FILTER };

    // Preset Filters
    if (options.filter === 'new') mongoFilter.isNewArrival = true;
    if (options.filter === 'bestsellers') mongoFilter.isBestSeller = true;
    if (options.filter === 'limited') mongoFilter.isLimitedEdition = true;
    if (options.filter === 'preorder') mongoFilter.isPreOrder = true;
    if (options.filter === 'sale') mongoFilter.compareAtPrice = { $gt: 0 };

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Category filter
    if (options.category) {
      const catClean = escapeRegex(options.category.toLowerCase().replace(/s$/, '').replace(/-/g, ' '));
      mongoFilter.$or = [
        { categorySlug: { $regex: catClean, $options: 'i' } },
        { categoryName: { $regex: catClean, $options: 'i' } },
      ];
    }

    // Anime Franchise filter
    if (options.anime) {
      const animeClean = escapeRegex(options.anime.toLowerCase().replace(/-/g, ' '));
      mongoFilter.$and = mongoFilter.$and || [];
      mongoFilter.$and.push({
        $or: [
          { animeSlug: { $regex: animeClean, $options: 'i' } },
          { animeName: { $regex: animeClean, $options: 'i' } },
        ],
      });
    }

    // Brand filter
    if (options.brand) {
      mongoFilter.brandName = { $regex: escapeRegex(options.brand), $options: 'i' };
    }

    // Character filter
    if (options.character) {
      mongoFilter.characterName = { $regex: escapeRegex(options.character), $options: 'i' };
    }

    // Search filter
    if (options.search) {
      const q = escapeRegex(options.search.trim());
      mongoFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { characterName: { $regex: q, $options: 'i' } },
        { animeName: { $regex: q, $options: 'i' } },
        { categoryName: { $regex: q, $options: 'i' } },
        { brandName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    // Stock filter
    if (options.inStock) {
      mongoFilter.stock = { $gt: 0 };
    }

    // Price filters
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      mongoFilter.price = {};
      if (options.minPrice !== undefined) mongoFilter.price.$gte = options.minPrice;
      if (options.maxPrice !== undefined) mongoFilter.price.$lte = options.maxPrice;
    }

    // Sorting
    const sortOptions: any = {};
    if (options.sort === 'newest') {
      sortOptions.createdAt = -1;
    } else if (options.sort === 'price-asc') {
      sortOptions.price = 1;
    } else if (options.sort === 'price-desc') {
      sortOptions.price = -1;
    } else if (options.sort === 'bestselling') {
      sortOptions.isBestSeller = -1;
      sortOptions.createdAt = -1;
    } else {
      // Default featured
      sortOptions.isFeatured = -1;
      sortOptions.createdAt = -1;
    }

    const [products, total] = await Promise.all([
      col.find(mongoFilter).sort(sortOptions).skip(skip).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);

    if (products && products.length > 0) {
      const formattedProducts = products.map((p) => ({
        ...p,
        id: p._id ? p._id.toString() : ((p as any).id || p.slug),
        _id: p._id ? p._id.toString() : undefined,
      }));

      return {
        products: formattedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
    if (!demoCatalogAllowed()) {
      return { products: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  } catch (err) {
    if (!demoCatalogAllowed()) {
      console.error(JSON.stringify({ event: 'catalog.db_error', fn: 'getProducts', message: (err as Error)?.message }));
      throw err;
    }
    console.warn('⚠️ [MongoDB] getProducts fallback notice:', (err as Error)?.message || err);
  }

  // Development/test only: fall back to MOCK_PRODUCTS when the database is unreachable or empty
  let fallback = MOCK_PRODUCTS.map((m) => ({
    ...m,
    id: m.id || m.slug,
    _id: m.id as any,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as any[];

  if (options.filter === 'new') fallback = fallback.filter((p) => p.isNewArrival);
  if (options.filter === 'bestsellers') fallback = fallback.filter((p) => p.isBestSeller);
  if (options.filter === 'limited') fallback = fallback.filter((p) => p.isLimitedEdition);
  if (options.filter === 'preorder') fallback = fallback.filter((p) => p.isPreOrder);
  if (options.category) fallback = fallback.filter((p) => (p.categorySlug || '').toLowerCase().includes(options.category!.toLowerCase()));
  if (options.anime) fallback = fallback.filter((p) => (p.animeName || '').toLowerCase().includes(options.anime!.toLowerCase()));
  if (options.character) fallback = fallback.filter((p) => (p.characterName || '').toLowerCase().includes(options.character!.toLowerCase()));

  const total = fallback.length;
  const products = fallback.slice(skip, skip + limit);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function shapeProduct(prod: any): DbProduct {
  return { ...prod, id: prod._id?.toString() || prod.id || prod.slug, _id: prod._id?.toString() };
}

function demoProduct(idOrSlug: string): DbProduct | null {
  const m = MOCK_PRODUCTS.find((p) => p.slug === idOrSlug || p.id === idOrSlug);
  return m ? ({ ...m, id: m.id || m.slug, _id: m.id as any, isPublished: true, createdAt: new Date(), updatedAt: new Date() } as any) : null;
}

/** Storefront lookup by slug. Hidden products are not found. */
export async function getProductBySlug(slug: string): Promise<DbProduct | null> {
  if (!slug || typeof slug !== 'string') return null;
  try {
    const col = await getProductsCollection();
    const prod = await col.findOne({ slug, ...PUBLISHED_FILTER });
    if (prod) return shapeProduct(prod);
    return demoCatalogAllowed() ? demoProduct(slug) : null;
  } catch (err) {
    if (!demoCatalogAllowed()) {
      console.error(JSON.stringify({ event: 'catalog.db_error', fn: 'getProductBySlug', message: (err as Error)?.message }));
      throw err;
    }
    return demoProduct(slug);
  }
}

/** Storefront lookup by slug or id. Hidden products are not found; no name matching. */
export async function getProductByIdOrSlug(idOrSlug: string): Promise<DbProduct | null> {
  if (!idOrSlug || typeof idOrSlug !== 'string' || idOrSlug.length > 200) return null;
  try {
    const col = await getProductsCollection();
    let prod = await col.findOne({ slug: idOrSlug, ...PUBLISHED_FILTER });
    if (!prod && ObjectId.isValid(idOrSlug) && idOrSlug.length === 24) {
      prod = await col.findOne({ _id: new ObjectId(idOrSlug) as any, ...PUBLISHED_FILTER });
    }
    if (prod) return shapeProduct(prod);
    return demoCatalogAllowed() ? demoProduct(idOrSlug) : null;
  } catch (err) {
    if (!demoCatalogAllowed()) {
      console.error(JSON.stringify({ event: 'catalog.db_error', fn: 'getProductByIdOrSlug', message: (err as Error)?.message }));
      throw err;
    }
    return demoProduct(idOrSlug);
  }
}

/**
 * Look up a product for checkout. Unlike getProductByIdOrSlug this never falls back to
 * the static demo catalog and never matches by name: only products that really exist in
 * the database, at their current database price, can be bought. A database outage
 * throws (checkout fails) rather than silently selling at stale demo prices.
 */
export async function getPurchasableProduct(idOrSlug: unknown): Promise<DbProduct | null> {
  if (typeof idOrSlug !== 'string' || !idOrSlug || idOrSlug.length > 200) return null;
  const col = await getProductsCollection();
  const prod =
    (await col.findOne({ slug: idOrSlug })) ||
    (ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
      ? await col.findOne({ _id: new ObjectId(idOrSlug) as any })
      : null);
  if (!prod) return null;
  if (prod.isPublished === false) return null;
  if (typeof prod.price !== 'number' || !Number.isFinite(prod.price) || prod.price <= 0) return null;
  return { ...prod, id: prod._id?.toString() || prod.slug, _id: prod._id?.toString() };
}

/**
 * Add or remove units atomically (the admin +/- buttons). Unlike setting an absolute number, this
 * cannot overwrite a sale that happened while the owner was looking at the page. Never goes below 0.
 * Returns the new stock, or null if the product does not exist or the change would go below 0.
 */
export async function adjustProductStock(idOrSlug: string, delta: number): Promise<number | null> {
  if (!idOrSlug || !Number.isInteger(delta) || delta === 0) return null;
  const col = await getProductsCollection();
  const idFilters: any[] = [{ slug: idOrSlug }];
  if (ObjectId.isValid(idOrSlug) && idOrSlug.length === 24) idFilters.push({ _id: new ObjectId(idOrSlug) });
  const filter: any = { $or: idFilters };
  if (delta < 0) filter.stock = { $gte: -delta };
  const res = await col.findOneAndUpdate(
    filter,
    { $inc: { stock: delta }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!res) return null;
  const isSoldOut = res.stock <= 0;
  if (res.isSoldOut !== isSoldOut) await col.updateOne({ _id: res._id }, { $set: { isSoldOut } });
  return res.stock;
}

/** Give stock back (order cancelled, or a multi-item COD order could not be fully reserved). */
export async function incrementProductStock(idOrSlug: string, quantity: number): Promise<boolean> {
  if (!idOrSlug || !(quantity > 0)) return false;
  const col = await getProductsCollection();
  const res = await col.updateOne(
    {
      $or: [
        { slug: idOrSlug },
        ...(ObjectId.isValid(idOrSlug) && idOrSlug.length === 24 ? [{ _id: new ObjectId(idOrSlug) }] : []),
      ],
    } as any,
    { $inc: { stock: quantity }, $set: { isSoldOut: false, updatedAt: new Date() } }
  );
  return res.modifiedCount === 1;
}

export async function getAllProductsAdmin(): Promise<DbProduct[]> {
  try {
    const col = await getProductsCollection();
    const prods = await col.find({}).sort({ createdAt: -1 }).toArray();
    return prods.map((p) => ({
      ...p,
      id: p._id?.toString() || (p as any).id || p.slug,
      _id: p._id?.toString(),
    }));
  } catch (err) {
    // The owner must never edit stock/prices against demo data: fail loudly in production.
    if (!demoCatalogAllowed()) throw err;
    return MOCK_PRODUCTS.map((m) => ({ ...m, id: m.id || m.slug, _id: m.id as any, isPublished: true, createdAt: new Date(), updatedAt: new Date() })) as any[];
  }
}

export async function createProduct(productData: Omit<DbProduct, '_id' | 'createdAt' | 'updatedAt'>): Promise<DbProduct> {
  const col = await getProductsCollection();
  const now = new Date();

  // Slugs are unique: a duplicate product name gets a short random suffix instead of failing.
  const baseSlug = (productData.slug || productData.name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
  let slug = baseSlug;
  while (await col.findOne({ slug }, { projection: { _id: 1 } })) {
    slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const rawImage = productData.image || '/catalog/dragon-ball/item-001.png';
  const normalizedImage = normalizeImageUrl(rawImage);
  const normalizedImages = (productData.images && productData.images.length > 0
    ? productData.images
    : [rawImage]
  ).map((img) => normalizeImageUrl(img));

  const newProduct: DbProduct = {
    ...productData,
    image: normalizedImage,
    images: normalizedImages,
    slug,
    isPublished: productData.isPublished !== false,
    stock: Number(productData.stock) || 0,
    isSoldOut: (Number(productData.stock) || 0) <= 0,
    createdAt: now,
    updatedAt: now,
  };

  const res = await col.insertOne(newProduct as any);
  return { ...newProduct, _id: res.insertedId };
}

export async function updateProduct(
  idOrSlug: string,
  updateData: Partial<DbProduct>
): Promise<DbProduct | null> {
  const col = await getProductsCollection();
  const now = new Date();

  const query: any = {
    $or: [
      { slug: idOrSlug },
      { _id: idOrSlug },
      ...(ObjectId.isValid(idOrSlug) ? [{ _id: new ObjectId(idOrSlug) }] : []),
    ],
  };

  const dataToSet: any = {
    ...updateData,
    updatedAt: now,
  };
  delete dataToSet._id;

  if (updateData.image) {
    dataToSet.image = normalizeImageUrl(updateData.image);
  }
  if (Array.isArray(updateData.images)) {
    dataToSet.images = updateData.images.map((img) => normalizeImageUrl(img));
  }

  if (updateData.price !== undefined) {
    dataToSet.price = Number(updateData.price);
  }
  if (updateData.compareAtPrice !== undefined) {
    dataToSet.compareAtPrice = updateData.compareAtPrice !== null ? Number(updateData.compareAtPrice) : null;
  }
  if (updateData.discount !== undefined) {
    dataToSet.discount = Number(updateData.discount);
  } else if (dataToSet.price !== undefined && dataToSet.compareAtPrice && dataToSet.compareAtPrice > dataToSet.price) {
    dataToSet.discount = Math.round(((dataToSet.compareAtPrice - dataToSet.price) / dataToSet.compareAtPrice) * 100);
  }

  if (updateData.stock !== undefined) {
    dataToSet.stock = Math.max(0, Number(updateData.stock));
    dataToSet.isSoldOut = dataToSet.stock <= 0;
  }

  await col.updateOne(query, { $set: dataToSet });
  return await col.findOne(query);
}

export async function updateProductStock(idOrSlug: string, stock: number): Promise<boolean> {
  const col = await getProductsCollection();
  const now = new Date();

  const query: any = {
    $or: [
      { slug: idOrSlug },
      { _id: idOrSlug },
      ...(ObjectId.isValid(idOrSlug) ? [{ _id: new ObjectId(idOrSlug) }] : []),
    ],
  };

  const numStock = Math.max(0, stock);
  const res = await col.updateOne(query, {
    $set: {
      stock: numStock,
      isSoldOut: numStock <= 0,
      updatedAt: now,
    },
  });

  return res.matchedCount > 0;
}

/**
 * Atomically decrement stock when a product sells
 */
export async function decrementProductStock(idOrSlug: string, quantity: number): Promise<boolean> {
  if (!idOrSlug || quantity <= 0) return false;
  try {
    const col = await getProductsCollection();
    const query: any = {
      $or: [
        { slug: idOrSlug },
        { _id: idOrSlug },
        ...(ObjectId.isValid(idOrSlug) ? [{ _id: new ObjectId(idOrSlug) }] : []),
      ],
      stock: { $gte: quantity },
    };

    const res = await col.findOneAndUpdate(
      query,
      {
        $inc: { stock: -quantity },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (res) {
      if (res.stock <= 0) {
        await col.updateOne(
          { _id: res._id },
          { $set: { stock: 0, isSoldOut: true } }
        );
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to decrement stock for product ${idOrSlug}:`, err);
    return false;
  }
}

export async function deleteProduct(idOrSlug: string): Promise<boolean> {
  const col = await getProductsCollection();

  const query: any = {
    $or: [
      { slug: idOrSlug },
      { _id: idOrSlug },
      ...(ObjectId.isValid(idOrSlug) ? [{ _id: new ObjectId(idOrSlug) }] : []),
    ],
  };

  const res = await col.deleteOne(query);
  return res.deletedCount > 0;
}
