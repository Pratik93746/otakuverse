const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    shortDescription: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      default: null,
      min: [0, 'Compare at price cannot be negative'],
    },
    categoryId: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    categoryName: {
      type: String,
      default: '',
      trim: true,
    },
    categorySlug: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      default: 'BAKA Style',
      trim: true,
    },
    brandName: {
      type: String,
      default: '',
      trim: true,
    },
    characterName: {
      type: String,
      default: '',
      trim: true,
    },
    animeName: {
      type: String,
      default: '',
      trim: true,
    },
    animeSlug: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    images: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    sku: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    isLimitedEdition: {
      type: Boolean,
      default: false,
    },
    isPreOrder: {
      type: Boolean,
      default: false,
    },
    isSoldOut: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String, trim: true }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

productSchema.index({ isActive: 1, categorySlug: 1 });
productSchema.index({ isActive: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ isActive: 1, price: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
