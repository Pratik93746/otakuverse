const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');

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
   * Cryptographic verification of Razorpay payment signature (Section 11)
   */
  async verifyPayment(razorpayOrderId, razorpayPaymentId, signature) {
    if (!razorpayOrderId || !razorpayPaymentId || !signature) {
      throw new Error('Missing mandatory verification parameters.');
    }

    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      throw new Error(`No matching order found for Razorpay Order ID: ${razorpayOrderId}`);
    }

    // Idempotency: if already paid, return early
    if (order.paymentStatus === 'PAID') {
      return {
        success: true,
        alreadyProcessed: true,
        orderId: order._id,
        orderNumber: order.orderNumber,
      };
    }

    // Cryptographic HMAC-SHA256 signature verification
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!isValid) {
      order.paymentStatus = 'FAILED';
      await order.save();

      await Payment.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        provider: 'razorpay',
        providerOrderId: razorpayOrderId,
        providerPaymentId: razorpayPaymentId,
        amount: order.totalAmount,
        currency: order.currency,
        status: 'FAILED',
        signatureVerified: false,
      });

      throw new Error('Payment signature verification failed.');
    }

    // 1. Mark Order as PAID and CONFIRMED
    order.paymentStatus = 'PAID';
    order.orderStatus = 'CONFIRMED';
    order.razorpayPaymentId = razorpayPaymentId;
    order.paymentId = razorpayPaymentId;
    await order.save();

    // 2. Create Payment record
    await Payment.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      provider: 'razorpay',
      providerOrderId: razorpayOrderId,
      providerPaymentId: razorpayPaymentId,
      amount: order.totalAmount,
      currency: order.currency,
      status: 'CAPTURED',
      signatureVerified: true,
    });

    // 3. Atomically decrement stock for each ordered item with negative stock prevention (Section 28)
    for (const item of order.items) {
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

    // 4. Clear user cart upon successful purchase (Section 27)
    await Cart.findOneAndUpdate(
      { userId: order.userId },
      { $set: { items: [] } }
    );

    return {
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
    };
  }

  /**
   * Razorpay Webhook Handler for asynchronous server-to-server notifications
   */
  async handleWebhook(rawBody, signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const orderNumber = paymentEntity?.notes?.orderNumber;

      let matchedOrder = null;
      if (orderNumber) {
        matchedOrder = await Order.findOne({ orderNumber });
      }
      if (!matchedOrder && razorpayOrderId) {
        matchedOrder = await Order.findOne({ razorpayOrderId });
      }

      if (matchedOrder && matchedOrder.paymentStatus !== 'PAID') {
        matchedOrder.paymentStatus = 'PAID';
        matchedOrder.orderStatus = 'CONFIRMED';
        matchedOrder.razorpayPaymentId = paymentId;
        matchedOrder.paymentId = paymentId;
        await matchedOrder.save();

        for (const item of matchedOrder.items) {
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

        await Cart.findOneAndUpdate({ userId: matchedOrder.userId }, { $set: { items: [] } });
      }
    }

    return { received: true };
  }
}

module.exports = new PaymentService();
