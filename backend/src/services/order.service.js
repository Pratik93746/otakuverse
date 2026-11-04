const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const httpError = require('../utils/httpError');
const { getPagination, formatPagination } = require('../utils/pagination');

const ACTIVE_COUPONS = {
  OTAKU10: { type: 'PERCENTAGE', value: 10, maxDiscount: 1000, minOrder: 1500 },
  BANKAI20: { type: 'PERCENTAGE', value: 20, maxDiscount: 2000, minOrder: 3000 },
  GOJO500: { type: 'FIXED', value: 500, minOrder: 4000 },
  WELCOME: { type: 'PERCENTAGE', value: 15, maxDiscount: 1500, minOrder: 2000, oncePerCustomer: true },
  POSTER15: { type: 'PERCENTAGE', value: 15, maxDiscount: 1000, minOrder: 999 },
  FIRSTWALL: { type: 'FIXED', value: 200, minOrder: 1200, oncePerCustomer: true },
};

const MAX_LINES = 30;
const MAX_QTY_PER_LINE = 20;
/** Unfinished COD orders one account may hold (limits fake-COD stock hoarding). */
const MAX_OPEN_COD_ORDERS = 3;
/** Unpaid online orders one account may hold (each one reserves stock). */
const MAX_PENDING_ONLINE_ORDERS = 5;
/** How long an unpaid online order keeps its stock reserved. */
const RESERVATION_MINUTES = 30;

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
/** Which statuses an admin may move an order to from each status. */
const ADMIN_TRANSITIONS = {
  PENDING: ['CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

class OrderService {
  /** Unique, unguessable, human-readable order number. */
  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `OV-${timestamp}-${random}`;
  }

  /** Give an order's reserved stock back exactly once, however many times this is called. */
  async restockOrderOnce(order) {
    const claim = await Order.updateOne(
      { _id: order._id, stockHeld: true, stockRestoredAt: null },
      { $set: { stockRestoredAt: new Date(), stockHeld: false } }
    );
    if (claim.modifiedCount !== 1) return false;
    for (const item of order.items || []) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity }, $set: { isSoldOut: false } }
      ).catch((e) => console.error('Restock failed', item.productId, e.message));
    }
    return true;
  }

  /** Cancel unpaid online orders whose reservation ran out and return their stock. Idempotent. */
  async releaseExpiredReservations(limit = 50) {
    const expired = await Order.find({
      orderStatus: 'PENDING',
      paymentMethod: 'RAZORPAY',
      paymentStatus: { $ne: 'PAID' },
      stockHeld: true,
      reservationExpiresAt: { $lt: new Date() },
    }).limit(limit).lean();

    let released = 0;
    for (const o of expired) {
      const before = await Order.findOneAndUpdate(
        { _id: o._id, orderStatus: 'PENDING', paymentStatus: { $ne: 'PAID' } },
        { $set: { orderStatus: 'CANCELLED', paymentStatus: 'FAILED', couponOnceKey: null } },
        { new: false }
      ).lean();
      if (before) {
        await this.restockOrderOnce(before);
        released++;
      }
    }
    return released;
  }

  /**
   * Zero-trust server-side order calculation & creation.
   * Client-supplied prices, discounts and identities are never trusted. Stock is reserved atomically
   * and any failure rolls back everything already taken (stock, coupon usage).
   */
  async createOrder(userId, customer, items, shippingAddress, couponCode = null, currency = 'INR', paymentMethod = 'RAZORPAY') {
    if (!Array.isArray(items) || items.length === 0) {
      throw httpError('Order items array cannot be empty.', 400, 'ITEMS_EMPTY');
    }
    if (items.length > MAX_LINES) throw httpError('Too many items in one order.', 400, 'TOO_MANY_ITEMS');

    const isCod = typeof paymentMethod === 'string' && paymentMethod.toUpperCase() === 'COD';

    // Merge duplicate lines so the stock check sees the true total per product
    const wanted = new Map();
    for (const item of items) {
      const pid = item && typeof item.productId === 'string' ? item.productId.trim() : '';
      const qty = item && typeof item.quantity === 'number' ? item.quantity : NaN;
      if (!pid || pid.length > 128) throw httpError('Invalid item in order.', 400, 'ITEM_INVALID');
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
        throw httpError(`Quantity must be a whole number between 1 and ${MAX_QTY_PER_LINE}.`, 400, 'QUANTITY_INVALID');
      }
      wanted.set(pid, (wanted.get(pid) || 0) + qty);
    }

    // Opportunistically free stock held by abandoned checkouts.
    await this.releaseExpiredReservations().catch(() => {});

    const catalogProducts = await Product.find({ _id: { $in: [...wanted.keys()] } });
    const catalogMap = new Map(catalogProducts.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let subtotal = 0;
    for (const [pid, quantity] of wanted) {
      const product = catalogMap.get(pid);
      if (!product || product.isActive === false) {
        throw httpError(`Product with ID ${pid} is not available in the catalog.`, 400, 'PRODUCT_UNAVAILABLE');
      }
      if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0) {
        throw httpError(`Product "${product.name}" is not available for purchase.`, 400, 'PRODUCT_UNAVAILABLE');
      }
      if (!(product.stock >= quantity)) {
        throw httpError(`Insufficient stock for "${product.name}". Available: ${Math.max(0, product.stock || 0)}, requested: ${quantity}.`, 409, 'INSUFFICIENT_STOCK');
      }
      // STRICTLY enforce the catalog price snapshot
      const itemSubtotal = Math.round(product.price * 100) * quantity;
      subtotal += itemSubtotal;
      orderItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku || product.slug,
        price: product.price,
        quantity,
        image: product.thumbnail || (product.images && product.images[0] ? product.images[0].url : '') || '',
      });
    }
    subtotal = subtotal / 100;

    // Zero-Trust Server-Side Coupon & Discount Calculation
    let validDiscount = 0;
    let appliedCode = null;
    let onceKey = null;
    let dbCoupon = null;
    if (couponCode !== undefined && couponCode !== null && couponCode !== '') {
      if (typeof couponCode !== 'string') throw httpError('Invalid coupon code.', 400, 'COUPON_INVALID');
      const cleanCode = couponCode.toUpperCase().trim().slice(0, 32);
      let couponDef = null;

      dbCoupon = await Coupon.findOne({ code: cleanCode, isActive: true });
      if (dbCoupon) {
        if (dbCoupon.expiresAt && new Date(dbCoupon.expiresAt) < new Date()) {
          throw httpError(`Coupon "${cleanCode}" has expired.`, 400, 'COUPON_EXPIRED');
        }
        if (dbCoupon.usageLimit && dbCoupon.usedCount >= dbCoupon.usageLimit) {
          throw httpError(`Coupon "${cleanCode}" usage limit has been reached.`, 400, 'COUPON_EXHAUSTED');
        }
        couponDef = {
          type: dbCoupon.discountType,
          value: dbCoupon.discountValue,
          minOrder: dbCoupon.minOrderAmount,
          maxDiscount: dbCoupon.maxDiscountAmount,
          oncePerCustomer: !!dbCoupon.oncePerCustomer,
        };
      } else if (Object.prototype.hasOwnProperty.call(ACTIVE_COUPONS, cleanCode)) {
        couponDef = ACTIVE_COUPONS[cleanCode];
      }

      if (!couponDef) throw httpError(`Invalid or unrecognized coupon code: "${cleanCode}".`, 400, 'COUPON_INVALID');
      if (couponDef.minOrder && subtotal < couponDef.minOrder) {
        throw httpError(`Coupon "${cleanCode}" requires a minimum order subtotal of ₹${couponDef.minOrder}.`, 400, 'COUPON_MIN_ORDER');
      }

      if (couponDef.type === 'PERCENTAGE') {
        const pct = Math.round((subtotal * couponDef.value) / 100);
        validDiscount = couponDef.maxDiscount ? Math.min(pct, couponDef.maxDiscount) : pct;
      } else {
        validDiscount = couponDef.value;
      }
      validDiscount = Math.min(Math.max(0, validDiscount), subtotal);
      appliedCode = cleanCode;

      if (couponDef.oncePerCustomer) {
        onceKey = cleanCode;
        if (await Order.exists({ userId, couponOnceKey: onceKey })) {
          throw httpError(`Coupon ${cleanCode} can only be used once per customer.`, 400, 'COUPON_ALREADY_USED');
        }
      }
    }

    const shippingFee = 0; // Free delivery policy
    const tax = 0; // Tax included
    const totalPaise = Math.round(subtotal * 100) + shippingFee + tax - Math.round(validDiscount * 100);
    if (totalPaise < 100) throw httpError('Order total is below the minimum payable amount.', 400, 'TOTAL_TOO_LOW');
    const totalAmount = totalPaise / 100;

    // Per-account caps against stock hoarding
    if (isCod) {
      const open = await Order.countDocuments({ userId, paymentMethod: 'COD', orderStatus: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED'] } });
      if (open >= MAX_OPEN_COD_ORDERS) {
        throw httpError('You already have several cash-on-delivery orders in progress.', 429, 'COD_LIMIT');
      }
    } else {
      const pending = await Order.countDocuments({ userId, paymentMethod: 'RAZORPAY', orderStatus: 'PENDING', stockHeld: true });
      if (pending >= MAX_PENDING_ONLINE_ORDERS) {
        throw httpError('You have several unpaid orders waiting for payment. Complete or wait for them to expire.', 429, 'PENDING_LIMIT');
      }
    }

    // Reserve stock atomically, all-or-nothing.
    const taken = [];
    const rollbackStock = async () => {
      for (const t of taken) {
        await Product.updateOne({ _id: t.productId }, { $inc: { stock: t.quantity }, $set: { isSoldOut: false } }).catch(() => {});
      }
    };
    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, isActive: { $ne: false }, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!updated) {
        await rollbackStock();
        throw httpError(`"${item.name}" just sold out. Please update your cart.`, 409, 'SOLD_OUT');
      }
      taken.push(item);
      if (updated.stock <= 0) await Product.updateOne({ _id: updated._id }, { $set: { isSoldOut: true } });
    }

    // Claim a use of a database coupon atomically (never exceeds its usage limit).
    let couponClaimed = false;
    if (dbCoupon) {
      const claimed = await Coupon.findOneAndUpdate(
        {
          _id: dbCoupon._id,
          isActive: true,
          $or: [{ usageLimit: null }, { usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
        },
        { $inc: { usedCount: 1 } }
      );
      if (!claimed) {
        await rollbackStock();
        throw httpError(`Coupon "${appliedCode}" usage limit has been reached.`, 400, 'COUPON_EXHAUSTED');
      }
      couponClaimed = true;
    }

    const now = Date.now();
    try {
      const saved = await new Order({
        orderNumber: this.generateOrderNumber(),
        userId,
        customer: {
          name: (customer && customer.name) || shippingAddress.fullName,
          email: (customer && customer.email) || '',
          phone: (customer && customer.phone) || shippingAddress.phone,
        },
        items: orderItems,
        subtotal,
        discount: validDiscount,
        shippingFee,
        tax,
        totalAmount,
        currency: 'INR',
        shippingAddress,
        paymentMethod: isCod ? 'COD' : 'RAZORPAY',
        paymentStatus: 'PENDING',
        orderStatus: isCod ? 'CONFIRMED' : 'PENDING',
        couponCode: appliedCode,
        couponOnceKey: onceKey,
        stockHeld: true,
        reservationExpiresAt: isCod ? null : new Date(now + RESERVATION_MINUTES * 60_000),
      }).save();
      return saved;
    } catch (err) {
      await rollbackStock();
      if (couponClaimed) await Coupon.updateOne({ _id: dbCoupon._id }, { $inc: { usedCount: -1 } }).catch(() => {});
      if (err && err.code === 11000 && err.keyPattern && err.keyPattern.couponOnceKey) {
        throw httpError(`Coupon ${appliedCode} can only be used once per customer.`, 400, 'COUPON_ALREADY_USED');
      }
      throw err;
    }
  }

  /**
   * Retrieve order by ID or orderNumber with authorization check (Section 38)
   */
  async getOrderById(orderIdOrNumber, requesterUserId, isAdmin = false) {
    if (typeof orderIdOrNumber !== 'string' || orderIdOrNumber.length > 64) return null;
    const query = mongoose.Types.ObjectId.isValid(orderIdOrNumber)
      ? { $or: [{ _id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }] }
      : { orderNumber: orderIdOrNumber };

    const order = await Order.findOne(query).lean();
    if (!order) return null;

    // IDOR protection: only the owner or an admin can view. Others get "not found", not "forbidden".
    if (!isAdmin && order.userId !== requesterUserId) return null;

    if (!isAdmin) {
      // Customers never need gateway internals or internal review notes.
      delete order.needsReview;
      delete order.reviewNote;
      delete order.couponOnceKey;
    }
    return order;
  }

  /**
   * Retrieve paginated user order history
   */
  async getUserOrders(userId, queryParams) {
    const { page, limit, skip } = getPagination(queryParams, 10, 50);

    const [orders, total] = await Promise.all([
      Order.find({ userId }, { needsReview: 0, reviewNote: 0, couponOnceKey: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

    if (typeof queryParams.orderStatus === 'string' && VALID_STATUSES.includes(queryParams.orderStatus.toUpperCase())) {
      filter.orderStatus = queryParams.orderStatus.toUpperCase();
    }
    if (typeof queryParams.paymentStatus === 'string' && validPaymentStatuses.includes(queryParams.paymentStatus.toUpperCase())) {
      filter.paymentStatus = queryParams.paymentStatus.toUpperCase();
    }
    if (typeof queryParams.search === 'string' && queryParams.search.trim()) {
      const s = queryParams.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
   * Update order status (Admin). Legal transitions only; compare-and-set so two admins cannot clash;
   * stock goes back exactly once on cancel; paid online orders are refunded outside this endpoint.
   */
  async updateOrderStatus(orderId, status, tracking = null) {
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
      throw httpError(`Invalid order status: ${String(status).slice(0, 20)}`, 400, 'STATUS_INVALID');
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw httpError('Invalid order id.', 400, 'ORDER_ID_INVALID');

    const current = await Order.findById(orderId).lean();
    if (!current) return null;

    if (current.orderStatus === status) throw httpError(`The order is already ${status.toLowerCase()}.`, 409, 'SAME_STATUS');
    if (!(ADMIN_TRANSITIONS[current.orderStatus] || []).includes(status)) {
      throw httpError(`An order that is ${current.orderStatus.toLowerCase()} cannot be changed to ${status.toLowerCase()}.`, 409, 'TRANSITION_NOT_ALLOWED');
    }
    const isCod = current.paymentMethod === 'COD';
    const isPaid = current.paymentStatus === 'PAID';
    if (['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status) && !isPaid && !isCod) {
      throw httpError('Payment has not been received for this order, so it cannot be packed or shipped.', 409, 'PAYMENT_NOT_RECEIVED');
    }
    if (status === 'CANCELLED' && !isCod && isPaid) {
      throw httpError('The customer already paid online. Refund them from the Razorpay dashboard, then cancel.', 409, 'REFUND_REQUIRED');
    }

    const set = { orderStatus: status };
    if (status === 'CANCELLED') set.couponOnceKey = null;
    if (status === 'DELIVERED' && isCod) set.paymentStatus = 'PAID';
    if (status === 'SHIPPED') set['tracking.shippedAt'] = new Date();
    if (tracking && typeof tracking === 'object') {
      // Only known, string-typed tracking fields are accepted.
      const t = (v) => (typeof v === 'string' ? v.trim().slice(0, 500) : undefined);
      if (t(tracking.carrier) !== undefined) set['tracking.carrier'] = t(tracking.carrier);
      if (t(tracking.trackingNumber) !== undefined) set['tracking.trackingNumber'] = t(tracking.trackingNumber);
      const url = t(tracking.trackingUrl);
      if (url && /^https?:\/\//i.test(url)) set['tracking.trackingUrl'] = url;
    }

    const updated = await Order.findOneAndUpdate(
      { _id: orderId, orderStatus: current.orderStatus },
      { $set: set },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw httpError('This order was just changed by someone else. Refresh and try again.', 409, 'CONCURRENT_UPDATE');

    if (status === 'CANCELLED') await this.restockOrderOnce(current);
    return updated;
  }
}

module.exports = new OrderService();
module.exports.ACTIVE_COUPONS = ACTIVE_COUPONS;
