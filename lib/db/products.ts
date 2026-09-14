import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbProduct } from './types';
import { ObjectId } from 'mongodb';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

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
    const mongoFilter: any = {};

    // Preset Filters
    if (options.filter === 'new') mongoFilter.isNewArrival = true;
    if (options.filter === 'bestsellers') mongoFilter.isBestSeller = true;
    if (options.filter === 'limited') mongoFilter.isLimitedEdition = true;
    if (options.filter === 'preorder') mongoFilter.isPreOrder = true;
    if (options.filter === 'sale') mongoFilter.compareAtPrice = { $gt: 0 };

    // Category filter
    if (options.category) {
      const catClean = options.category.toLowerCase().replace(/s$/, '').replace(/-/g, ' ');
      mongoFilter.$or = [
        { categorySlug: { $regex: catClean, $options: 'i' } },
        { categoryName: { $regex: catClean, $options: 'i' } },
      ];
    }

    // Anime Franchise filter
    if (options.anime) {
      const animeClean = options.anime.toLowerCase().replace(/-/g, ' ');
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
      mongoFilter.brandName = { $regex: options.brand, $options: 'i' };
    }

    // Character filter
    if (options.character) {
      mongoFilter.characterName = { $regex: options.character, $options: 'i' };
    }

    // Search filter
    if (options.search) {
      const q = options.search.trim();
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
  } catch (err) {
    console.warn('⚠️ [MongoDB] getProducts fallback notice:', (err as Error)?.message || err);
  }

  // Graceful fallback to MOCK_PRODUCTS when database is unreachable
  let fallback = MOCK_PRODUCTS.map((m) => ({
    ...m,
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

export async function getProductBySlug(slug: string): Promise<DbProduct | null> {
  if (!slug) return null;
  try {
    const col = await getProductsCollection();
    return await col.findOne({ slug });
  } catch {
    const m = MOCK_PRODUCTS.find((p) => p.slug === slug);
    return m ? ({ ...m, _id: m.id as any, isPublished: true, createdAt: new Date(), updatedAt: new Date() } as any) : null;
  }
}

export async function getProductByIdOrSlug(idOrSlug: string): Promise<DbProduct | null> {
  if (!idOrSlug) return null;
  try {
    const col = await getProductsCollection();

    // Try slug first
    let prod = await col.findOne({ slug: idOrSlug });
    if (prod) return prod;

    // Try Mongo ObjectId
    if (ObjectId.isValid(idOrSlug)) {
      prod = await col.findOne({ _id: new ObjectId(idOrSlug) as any });
      if (prod) return prod;
    }

    // Try name match
    prod = await col.findOne({ name: { $regex: `^${idOrSlug}$`, $options: 'i' } });
    if (prod) return prod;
  } catch {
    // fallback
  }

  const m = MOCK_PRODUCTS.find((p) => p.slug === idOrSlug || p.id === idOrSlug);
  return m ? ({ ...m, _id: m.id as any, isPublished: true, createdAt: new Date(), updatedAt: new Date() } as any) : null;
}

export async function getAllProductsAdmin(): Promise<DbProduct[]> {
  try {
    const col = await getProductsCollection();
    return await col.find({}).sort({ createdAt: -1 }).toArray();
  } catch {
    return MOCK_PRODUCTS.map((m) => ({ ...m, _id: m.id as any, isPublished: true, createdAt: new Date(), updatedAt: new Date() })) as any[];
  }
}

export async function createProduct(productData: Omit<DbProduct, '_id' | 'createdAt' | 'updatedAt'>): Promise<DbProduct> {
  const col = await getProductsCollection();
  const now = new Date();

  // Base slug generator if slug is missing
  let slug = productData.slug;
  if (!slug) {
    slug = productData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const existing = await col.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }
  }

  const newProduct: DbProduct = {
    ...productData,
    slug,
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

  const query: any = ObjectId.isValid(idOrSlug)
    ? { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }
    : { slug: idOrSlug };

  const dataToSet = {
    ...updateData,
    updatedAt: now,
  };
  delete (dataToSet as any)._id;

  if (updateData.stock !== undefined) {
    dataToSet.stock = Number(updateData.stock);
    dataToSet.isSoldOut = dataToSet.stock <= 0;
  }

  await col.updateOne(query, { $set: dataToSet });
  return await col.findOne(query);
}

export async function updateProductStock(idOrSlug: string, stock: number): Promise<boolean> {
  const col = await getProductsCollection();
  const now = new Date();

  const query: any = ObjectId.isValid(idOrSlug)
    ? { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }
    : { slug: idOrSlug };

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

export async function deleteProduct(idOrSlug: string): Promise<boolean> {
  const col = await getProductsCollection();

  const query: any = ObjectId.isValid(idOrSlug)
    ? { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }
    : { slug: idOrSlug };

  const res = await col.deleteOne(query);
  return res.deletedCount > 0;
}
