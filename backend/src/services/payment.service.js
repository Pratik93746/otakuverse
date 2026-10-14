const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const env = require('../config/env');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');

const httpError = (message, statusCode = 400, code = 'BAD_REQUEST') =>
  Object.assign(new Error(message), { statusCode, code });

const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128;

/** Constant-time string comparison that never throws on length mismatch. */
const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

class PaymentService {
  getRazorpayInstance() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.');
    }
    return new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create Razorpay Order for a verified Order document
   */
  async createRazorpayOrder(orderId, userId) {
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      throw new Error('Order not found or access denied.');
    }

    if (order.paymentStatus === 'PAID') {
      throw new Error('This order has already been paid.');
    }

    const rzp = this.getRazorpayInstance();
    const amountInPaise = Math.round(order.totalAmount * 100);

    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: order.currency || 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId,
      },
    });

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
    };
  }

  /**
   * Browser payment callback. The signature only proves Razorpay authorised THIS payment for THIS
   * gateway order; the order is located solely by that gateway order id and must belong to the caller.
   * A bad signature never changes any order.
   */
  async verifyPayment(razorpayOrderId, razorpayPaymentId, signature, userId) {
    if (!isId(razorpayOrderId) || !isId(razorpayPaymentId) || !isId(signature) || !isId(userId)) {
      throw httpError('Missing or invalid verification parameters.', 400, 'VERIFICATION_FIELDS_INVALID');
    }
    if (!env.RAZORPAY_KEY_SECRET) {
      throw httpError('Payments are not configured.', 503, 'PAYMENTS_UNAVAILABLE');
    }

    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    if (!safeEqual(expected, signature)) {
      throw httpError('Payment signature verification failed.', 400, 'SIGNATURE_INVALID');
    }

    const order = await Order.findOne({ razorpayOrderId, userId });
    if (!order) throw httpError('No matching order found.', 404, 'ORDER_NOT_FOUND');

    const claimed = await this._claimPaid(razorpayOrderId, razorpayPaymentId);
    if (!claimed) {
      const current = await Order.findOne({ razorpayOrderId, userId });
      if (current && current.paymentStatus === 'PAID' && current.razorpayPaymentId === razorpayPaymentId) {
        return { success: true, alreadyProcessed: true, orderId: current._id, orderNumber: current.orderNumber };
      }
      throw httpError('This order can no longer be paid. If you were charged, you will be refunded.', 409, 'ORDER_NOT_PAYABLE');
    }

    await this._afterPaid(claimed, razorpayPaymentId);
    return { success: true, orderId: claimed._id, orderNumber: claimed.orderNumber, amount: claimed.totalAmount };
  }

  /** Atomic transition PENDING -> PAID for exactly this gateway order. Returns the updated order or null. */
  async _claimPaid(razorpayOrderId, paymentId) {
    return Order.findOneAndUpdate(
      { razorpayOrderId, paymentStatus: { $ne: 'PAID' }, orderStatus: 'PENDING' },
      { $set: { paymentStatus: 'PAID', orderStatus: 'CONFIRMED', razorpayPaymentId: paymentId, paymentId } },
      { new: true }
    );
  }

  /** Effects of a successful payment; run only by the caller that won the claim. */
  async _afterPaid(order, paymentId) {
    await Payment.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      provider: 'razorpay',
      providerOrderId: order.razorpayOrderId,
      providerPaymentId: paymentId,
      amount: order.totalAmount,
      currency: order.currency,
      status: 'CAPTURED',
      signatureVerified: true,
    });

    const shortfalls = [];
    for (const item of order.items) {
      const query = {
        $or: [
          { slug: item.productId },
          ...(mongoose.Types.ObjectId.isValid(item.productId) ? [{ _id: item.productId }] : []),
        ],
        stock: { $gte: item.quantity },
      };
      const updated = await Product.findOneAndUpdate(query, { $inc: { stock: -item.quantity } }, { new: true });
      if (!updated) shortfalls.push(`${item.productId} x${item.quantity}`);
      else if (updated.stock <= 0) await Product.updateOne({ _id: updated._id }, { $set: { isSoldOut: true } });
    }
    if (shortfalls.length) {
      // Paid but not enough stock: never hide this. The owner must contact or refund the customer.
      await Order.updateOne({ _id: order._id }, { $set: { needsReview: true, reviewNote: `OUT_OF_STOCK_AFTER_PAYMENT: ${shortfalls.join(', ')}` } });
      console.error(JSON.stringify({ event: 'order.review_flag', orderNumber: order.orderNumber, flag: 'OUT_OF_STOCK_AFTER_PAYMENT', detail: shortfalls.join(', ') }));
    }

    await Cart.findOneAndUpdate({ userId: order.userId }, { $set: { items: [] } });
  }

  /**
   * Razorpay webhook. Authenticated by HMAC over the raw body. The order is located ONLY by the
   * gateway order id stored when we created the Razorpay order (payment.notes are ignored), the payment
   * must be captured, and amount and currency must equal the order's. Anything else is logged and ignored.
   */
  async handleWebhook(rawBody, signature) {
    // The dedicated webhook secret is required in production; the key-secret fallback is dev/test only.
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET || (env.NODE_ENV === 'production' ? '' : env.RAZORPAY_KEY_SECRET);

    if (!isId(signature)) throw httpError('Unauthorized: Missing x-razorpay-signature header.', 400, 'SIGNATURE_MISSING');
    if (!webhookSecret) throw httpError('Server configuration error: Webhook secret is not configured.', 500, 'WEBHOOK_UNCONFIGURED');
    if (!rawBody) throw httpError('Empty webhook body.', 400, 'EMPTY_BODY');

    const rawBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
    if (rawBuffer.length > 256 * 1024) throw httpError('Payload too large.', 413, 'TOO_LARGE');

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBuffer).digest('hex');
    if (!safeEqual(expected, signature)) throw httpError('Invalid webhook signature.', 400, 'SIGNATURE_INVALID');

    const payload = JSON.parse(rawBuffer.toString('utf8'));
    const event = payload.event;
    const payment = payload.payload && payload.payload.payment && payload.payload.payment.entity;

    if ((event === 'payment.captured' || event === 'order.paid') && payment) {
      if (!isId(payment.id) || !isId(payment.order_id) || payment.status !== 'captured') {
        return { received: true, ignored: true };
      }
      const order = await Order.findOne({ razorpayOrderId: payment.order_id });
      if (!order) {
        console.error(JSON.stringify({ event: 'payment.unmatched', paymentId: payment.id, razorpayOrderId: payment.order_id }));
        return { received: true };
      }
      const expectedPaise = Math.round(order.totalAmount * 100);
      if (payment.amount !== expectedPaise || String(payment.currency).toUpperCase() !== 'INR') {
        await Order.updateOne({ _id: order._id }, { $set: { needsReview: true, reviewNote: `AMOUNT_MISMATCH: paid ${payment.amount} ${payment.currency}, expected ${expectedPaise} INR` } });
        console.error(JSON.stringify({ event: 'payment.amount_mismatch', orderNumber: order.orderNumber, paymentId: payment.id }));
        return { received: true };
      }
      const claimed = await this._claimPaid(payment.order_id, payment.id);
      if (claimed) {
        await this._afterPaid(claimed, payment.id);
      } else {
        const current = await Order.findOne({ _id: order._id });
        if (current && current.orderStatus === 'CANCELLED') {
          await Order.updateOne({ _id: order._id }, { $set: { needsReview: true, reviewNote: `PAID_AFTER_CANCELLATION: ${payment.id}` } });
        }
      }
    }
    // payment.failed is intentionally a no-op: a failed attempt must not alter or block the order.

    return { received: true };
  }
}

module.exports = new PaymentService();
