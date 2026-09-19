const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { getPagination, formatPagination } = require('../utils/pagination');

class OrderService {
  /**
   * Helper to generate unique human-readable order number
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `OV-${timestamp}-${random}`;
  }

  /**
   * Zero-trust server-side order calculation & creation
   */
  async createOrder(userId, customer, items, shippingAddress, discount = 0, currency = 'INR') {
    if (!items || items.length === 0) {
      throw new Error('Order items array cannot be empty.');
    }

    const orderItems = [];
    let subtotal = 0;

    // Resolve products in batch
    const productIds = items.map((i) => i.productId);
    const catalogProducts = await Product.find({ _id: { $in: productIds } });
    const catalogMap = new Map();
    for (const p of catalogProducts) {
      catalogMap.set(p._id.toString(), p);
    }

    for (const item of items) {
      const product = catalogMap.get(item.productId.toString());

      if (!product) {
        throw new Error(`Product with ID ${item.productId} was not found in active catalog.`);
      }

      if (!product.isActive) {
        throw new Error(`Product "${product.name}" is currently not available for purchase.`);
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${quantity}.`);
      }

      // STRICTLY enforce catalog price snapshot
      const price = product.price;
      const itemSubtotal = price * quantity;
      subtotal += itemSubtotal;

      const productImage = product.thumbnail || (product.images && product.images[0] ? product.images[0].url : '');

      orderItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku || product.slug,
        price,
        quantity,
        image: productImage,
      });
    }

    const validDiscount = Math.min(Math.max(0, Number(discount) || 0), subtotal);
    const shippingFee = 0; // Free delivery policy
    const tax = 0; // Tax included
    const totalAmount = subtotal + shippingFee + tax - validDiscount;

    if (totalAmount <= 0) {
      throw new Error('Calculated order total must be greater than zero.');
    }

    const orderNumber = this.generateOrderNumber();

    const isCod = orderData.paymentMethod === 'COD' || orderData.paymentMethod === 'cod';

    const newOrder = new Order({
      orderNumber,
      userId,
      customer: {
        name: customer?.name || shippingAddress.fullName,
        email: customer?.email || '',
        phone: customer?.phone || shippingAddress.phone,
      },
      items: orderItems,
      subtotal,
      discount: validDiscount,
      shippingFee,
      tax,
      totalAmount,
      currency,
      shippingAddress,
      paymentStatus: 'PENDING',
      orderStatus: isCod ? 'CONFIRMED' : 'PENDING',
    });

    const savedOrder = await newOrder.save();

    // If order is Cash On Delivery, confirm stock reduction on sale
    if (isCod) {
      for (const item of orderItems) {
        const query = {
          $or: [
            { _id: item.productId },
            { slug: item.productId },
            ...(mongoose.Types.ObjectId.isValid(item.productId) ? [{ _id: item.productId }] : []),
          ],
          stock: { $gte: item.quantity },
        };
        const updated = await Product.findOneAndUpdate(
          query,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (updated && updated.stock <= 0) {
          await Product.updateOne({ _id: updated._id }, { $set: { isSoldOut: true } });
        }
      }
    }

    return savedOrder;
  }

  /**
   * Retrieve order by ID or orderNumber with authorization check (Section 38)
   */
  async getOrderById(orderIdOrNumber, requesterUserId, isAdmin = false) {
    const query = mongoose.Types.ObjectId.isValid(orderIdOrNumber)
      ? { $or: [{ _id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }] }
      : { orderNumber: orderIdOrNumber };

    const order = await Order.findOne(query).lean();
    if (!order) return null;

    // IDOR protection: only owner or authorized admin can view
    if (!isAdmin && order.userId !== requesterUserId) {
      const error = new Error('Forbidden: You are not authorized to view this order.');
      error.statusCode = 403;
      throw error;
    }

    return order;
  }

  /**
   * Retrieve paginated user order history
   */
  async getUserOrders(userId, queryParams) {
    const { page, limit, skip } = getPagination(queryParams, 10, 50);

    const [orders, total] = await Promise.all([
      Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ userId }),
    ]);

    return {
      orders,
      pagination: formatPagination(page, limit, total),
    };
  }

  /**
   * Retrieve paginated orders for Admin (Section 29)
   */
  async getAllOrdersAdmin(queryParams) {
    const { page, limit, skip } = getPagination(queryParams, 20, 50);

    const filter = {};
    if (queryParams.orderStatus) {
      filter.orderStatus = queryParams.orderStatus;
    }
    if (queryParams.paymentStatus) {
      filter.paymentStatus = queryParams.paymentStatus;
    }
    if (queryParams.search) {
      const s = queryParams.search.trim();
      filter.$or = [
        { orderNumber: { $regex: s, $options: 'i' } },
        { 'customer.email': { $regex: s, $options: 'i' } },
        { 'customer.name': { $regex: s, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: formatPagination(page, limit, total),
    };
  }

  /**
   * Update order status (Admin)
   */
  async updateOrderStatus(orderId, status, tracking = null) {
    const update = { orderStatus: status };
    if (tracking) {
      update.tracking = tracking;
    }

    return await Order.findByIdAndUpdate(orderId, { $set: update }, { new: true }).lean();
  }
}

module.exports = new OrderService();
