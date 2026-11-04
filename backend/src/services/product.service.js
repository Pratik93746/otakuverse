const mongoose = require('mongoose');
const Product = require('../models/Product');
const { getPagination, formatPagination } = require('../utils/pagination');
const { sanitizeString } = require('../validators/product.validator');

const TEXT_FIELDS = ['name', 'description', 'shortDescription', 'categoryName', 'categorySlug', 'brand', 'brandName', 'characterName', 'animeName', 'animeSlug', 'image', 'thumbnail', 'sku'];
const BOOL_FIELDS = ['isActive', 'isFeatured', 'isNewArrival', 'isBestSeller', 'isLimitedEdition', 'isPreOrder'];
const validationError = (message) => Object.assign(new Error(message), { statusCode: 400, code: 'VALIDATION_ERROR' });

/** The only fields an admin may set through the API; everything else (e.g. _id, rating) is dropped. */
function pickProductFields(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const k of TEXT_FIELDS) {
    if (typeof input[k] === 'string') out[k] = input[k].trim().slice(0, k === 'description' ? 5000 : 500);
  }
  for (const k of BOOL_FIELDS) {
    if (typeof input[k] === 'boolean') out[k] = input[k];
  }
  for (const k of ['price', 'compareAtPrice']) {
    if (input[k] !== undefined && input[k] !== null) {
      const n = Number(input[k]);
      if (!Number.isFinite(n) || n < 0 || n > 1000000) throw validationError(`${k} must be a number between 0 and 1,000,000.`);
      out[k] = Math.round(n * 100) / 100;
    }
  }
  if (input.stock !== undefined) {
    const n = Number(input.stock);
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw validationError('stock must be a whole number between 0 and 100,000.');
    out.stock = n;
    out.isSoldOut = n <= 0;
  }
  if (Array.isArray(input.images)) {
    out.images = input.images.slice(0, 12).map((i) => {
      if (typeof i === 'string') return { url: i.trim().slice(0, 1000) };
      if (i && typeof i.url === 'string') return { url: i.url.trim().slice(0, 1000), alt: typeof i.alt === 'string' ? i.alt.slice(0, 200) : undefined, isMain: !!i.isMain };
      return null;
    }).filter(Boolean);
  }
  if (Array.isArray(input.tags)) out.tags = input.tags.filter((t) => typeof t === 'string').slice(0, 20).map((t) => t.trim().slice(0, 50));
  return out;
}

class ProductService {
  /**
   * Optimized paginated product catalog query adhering to Section 13 & 16
   */
  async getProducts(queryParams) {
    const { page, limit, skip } = getPagination(queryParams, 24, 50);

    // Support products where isActive is true or not explicitly false
    const filter = { isActive: { $ne: false } };

    // Filter shortcuts
    if (queryParams.filter === 'new') filter.isNewArrival = true;
    if (queryParams.filter === 'bestsellers') filter.isBestSeller = true;
    if (queryParams.filter === 'limited') filter.isLimitedEdition = true;
    if (queryParams.filter === 'preorder') filter.isPreOrder = true;
    if (queryParams.filter === 'sale') filter.compareAtPrice = { $gt: 0 };

    // Category filter
    if (queryParams.category) {
      const cat = sanitizeString(queryParams.category).toLowerCase().replace(/s$/, '').replace(/-/g, ' ');
      filter.$or = [
        { categorySlug: { $regex: cat, $options: 'i' } },
        { categoryName: { $regex: cat, $options: 'i' } },
      ];
    }

    // Anime franchise filter
    if (queryParams.anime) {
      const anime = sanitizeString(queryParams.anime).replace(/-/g, ' ');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { animeSlug: { $regex: anime, $options: 'i' } },
          { animeName: { $regex: anime, $options: 'i' } },
        ],
      });
    }

    // Brand filter
    if (queryParams.brand) {
      const brand = sanitizeString(queryParams.brand);
      filter.$or = [
        { brand: { $regex: brand, $options: 'i' } },
        { brandName: { $regex: brand, $options: 'i' } },
      ];
    }

    // Tag filter
    if (queryParams.tag) {
      const tag = sanitizeString(queryParams.tag);
      filter.tags = tag;
    }

    // In-stock filter
    if (queryParams.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Price range filters
    if (queryParams.minPrice !== undefined || queryParams.maxPrice !== undefined) {
      filter.price = {};
      if (queryParams.minPrice !== undefined) filter.price.$gte = Number(queryParams.minPrice);
      if (queryParams.maxPrice !== undefined) filter.price.$lte = Number(queryParams.maxPrice);
    }

    // Search query
    if (queryParams.q) {
      const q = sanitizeString(queryParams.q);
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { characterName: { $regex: q, $options: 'i' } },
        { animeName: { $regex: q, $options: 'i' } },
        { categoryName: { $regex: q, $options: 'i' } },
        { brandName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    // Sorting
    const sort = {};
    switch (queryParams.sort) {
      case 'price_asc':
      case 'price-asc':
        sort.price = 1;
        break;
      case 'price_desc':
      case 'price-desc':
        sort.price = -1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'bestselling':
        sort.isBestSeller = -1;
        sort.createdAt = -1;
        break;
      default:
        sort.isFeatured = -1;
        sort.createdAt = -1;
        break;
    }

    // Projection to keep network payloads small (Section 13)
    const projection = {
      name: 1,
      slug: 1,
      price: 1,
      compareAtPrice: 1,
      discount: 1,
      categoryName: 1,
      categorySlug: 1,
      brandName: 1,
      brand: 1,
      characterName: 1,
      animeName: 1,
      animeSlug: 1,
      image: 1,
      thumbnail: 1,
      images: 1,
      stock: 1,
      isSoldOut: 1,
      isFeatured: 1,
      isNewArrival: 1,
      isBestSeller: 1,
      isLimitedEdition: 1,
      isPreOrder: 1,
      rating: 1,
      reviewCount: 1,
      createdAt: 1,
    };

    const [products, total] = await Promise.all([
      Product.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    const formattedProducts = products.map((p) => {
      const defaultImg = p.image || (Array.isArray(p.images) && p.images[0] ? (p.images[0].url || p.images[0]) : p.thumbnail) || '';
      return {
        ...p,
        id: p._id ? p._id.toString() : p.slug,
        image: defaultImg,
      };
    });

    return {
      products: formattedProducts,
      pagination: formatPagination(page, limit, total),
    };
  }

  /**
   * Retrieve product by slug with full detail
   */
  async getProductBySlug(slug) {
    const cleanSlug = sanitizeString(slug).toLowerCase();
    const product = await Product.findOne({ slug: cleanSlug, isActive: { $ne: false } }).lean();
    if (!product) return null;
    return {
      ...product,
      id: product._id ? product._id.toString() : product.slug,
      image: product.image || (Array.isArray(product.images) && product.images[0] ? (product.images[0].url || product.images[0]) : '') || '',
    };
  }

  /**
   * Retrieve product by ID or slug with full detail
   */
  async getProductById(id) {
    const query = {
      $or: [{ _id: id }, { slug: id }],
      isActive: { $ne: false },
    };
    const product = await Product.findOne(query).lean();
    if (!product) return null;
    return {
      ...product,
      id: product._id ? product._id.toString() : product.slug,
      image: product.image || (Array.isArray(product.images) && product.images[0] ? (product.images[0].url || product.images[0]) : '') || '',
    };
  }

  /**
   * Create new product (Admin)
   */
  async createProduct(productData) {
    const fields = pickProductFields(productData);
    const slug = productData.slug && typeof productData.slug === 'string'
      ? productData.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : String(fields.name || '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

    const existing = await Product.findOne({ slug });
    const finalSlug = existing ? `${slug}-${Math.random().toString(36).substring(2, 6)}` : slug;

    const newProduct = new Product({
      ...fields,
      _id: new mongoose.Types.ObjectId().toString(),
      slug: finalSlug,
      isActive: true,
    });

    return await newProduct.save();
  }

  /**
   * Update product (Admin)
   */
  async updateProduct(id, updateData) {
    if (typeof id !== 'string' || id.length > 200) return null;
    const query = { $or: [{ _id: id }, { slug: id }] };
    const sanitized = pickProductFields(updateData);
    if (Object.keys(sanitized).length === 0) throw validationError('No valid fields to update.');

    return await Product.findOneAndUpdate(query, { $set: sanitized }, { new: true, runValidators: true }).lean();
  }

  /**
   * Permanently delete product from catalog and database to prevent storage bloat
   */
  async deleteProduct(id) {
    if (typeof id !== 'string' || id.length > 200) return false;
    const query = {
      $or: [
        { slug: id },
        { _id: id },
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
      ],
    };
    const result = await Product.findOneAndDelete(query);
    return !!result;
  }

  /**
   * Alias for backwards compatibility
   */
  async softDeleteProduct(id) {
    return await this.deleteProduct(id);
  }
}

module.exports = new ProductService();
