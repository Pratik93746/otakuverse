const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

class CartService {
  /**
   * Retrieve user cart and hydrate live product information
   */
  async getCart(userId) {
    let cart = await Cart.findOne({ userId }).lean();

    if (!cart) {
      return {
        userId,
        items: [],
        subtotal: 0,
        totalItems: 0,
      };
    }

    if (!cart.items || cart.items.length === 0) {
      return {
        _id: cart._id,
        userId: cart.userId,
        items: [],
        subtotal: 0,
        totalItems: 0,
      };
    }

    // Extract product IDs
    const productIds = cart.items.map((i) => i.productId);

    // Fetch live product details in one single batch query (no N+1!)
    const liveProducts = await Product.find(
      { _id: { $in: productIds } },
      { name: 1, slug: 1, price: 1, compareAtPrice: 1, thumbnail: 1, images: { $slice: 1 }, stock: 1, isActive: 1 }
    ).lean();

    const productMap = new Map();
    for (const p of liveProducts) {
      productMap.set(p._id.toString(), p);
    }

    let subtotal = 0;
    let totalItems = 0;
    const hydratedItems = [];

    for (const item of cart.items) {
      const prod = productMap.get(item.productId.toString());
      if (prod && prod.isActive) {
        const availableStock = prod.stock || 0;
        const validQuantity = Math.min(item.quantity, Math.max(1, availableStock));
        const itemPrice = prod.price || 0;
        const itemImage = prod.thumbnail || (prod.images && prod.images[0] ? prod.images[0].url : '');

        subtotal += itemPrice * validQuantity;
        totalItems += validQuantity;

        hydratedItems.push({
          productId: prod._id,
          name: prod.name,
          slug: prod.slug,
          image: itemImage,
          price: itemPrice,
          compareAtPrice: prod.compareAtPrice,
          quantity: validQuantity,
          stock: availableStock,
        });
      }
    }

    return {
      _id: cart._id,
      userId: cart.userId,
      items: hydratedItems,
      subtotal,
      totalItems,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Add item to cart with stock validation (Section 26)
   */
  async addItem(userId, productId, quantity = 1) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID.');
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      throw new Error('Product not found or is currently unavailable.');
    }

    if (product.stock < 1) {
      throw new Error(`"${product.name}" is currently out of stock.`);
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (i) => i.productId.toString() === productId.toString()
    );

    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    if (existingIndex > -1) {
      const currentQty = cart.items[existingIndex].quantity;
      const targetQty = currentQty + qtyToAdd;
      if (targetQty > product.stock) {
        throw new Error(`Cannot add more. Only ${product.stock} items available in stock.`);
      }
      cart.items[existingIndex].quantity = targetQty;
    } else {
      if (qtyToAdd > product.stock) {
        throw new Error(`Cannot add ${qtyToAdd}. Only ${product.stock} items available in stock.`);
      }
      cart.items.push({ productId, quantity: qtyToAdd });
    }

    await cart.save();
    return await this.getCart(userId);
  }

  /**
   * Update item quantity in cart
   */
  async updateItemQuantity(userId, productId, quantity) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID.');
    }

    const qty = parseInt(quantity, 10);
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new Error('Cart not found.');

    if (qty <= 0) {
      cart.items = cart.items.filter((i) => i.productId.toString() !== productId.toString());
    } else {
      const product = await Product.findOne({ _id: productId, isActive: true });
      if (!product) throw new Error('Product not found.');
      if (qty > product.stock) {
        throw new Error(`Requested quantity exceeds available stock (${product.stock}).`);
      }

      const item = cart.items.find((i) => i.productId.toString() === productId.toString());
      if (item) {
        item.quantity = qty;
      } else {
        cart.items.push({ productId, quantity: qty });
      }
    }

    await cart.save();
    return await this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId, productId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) return { items: [], subtotal: 0, totalItems: 0 };

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId.toString());
    await cart.save();
    return await this.getCart(userId);
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId) {
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
    return { userId, items: [], subtotal: 0, totalItems: 0 };
  }
}

module.exports = new CartService();
