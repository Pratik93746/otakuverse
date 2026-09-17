const mongoose = require('mongoose');

const allowedCategories = ['toys', 'posters', 'keychains', 'tshirts', 'collections'];

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: {
        values: allowedCategories,
        message: '{VALUE} is not a supported category. Must be one of: toys, posters, keychains, tshirts, collections'
      },
      lowercase: true,
      index: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    imageUrl: {
      type: String,
      required: [true, 'External CDN image URL is required'],
      trim: true
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      default: 0,
      min: [0, 'Stock cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ category: 1, createdAt: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
