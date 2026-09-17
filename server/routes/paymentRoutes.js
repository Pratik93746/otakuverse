const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const authMiddleware = require('../middleware/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.Router();

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

/**
 * @route   POST /api/payment/create-order
 * @desc    Zero-trust order creation: calculates server-side price and generates Razorpay order
 * @access  Private (Firebase Auth)
 */
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.uid;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order creation requires a non-empty items array.'
      });
    }

    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID format provided: ${productId}`
        });
      }

      const parsedQuantity = parseInt(quantity, 10);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${productId}: must be a positive integer.`
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} does not exist in catalog.`
        });
      }

      if (product.stock < parsedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.title}". Requested: ${parsedQuantity}, Available: ${product.stock}`
        });
      }

      const itemTotal = product.price * parsedQuantity;
      calculatedTotal += itemTotal;

      orderItems.push({
        productId: product._id,
        title: product.title,
        quantity: parsedQuantity,
        price: product.price
      });
    }

    if (calculatedTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Calculated order total must be greater than zero.'
      });
    }

    const razorpay = getRazorpayInstance();

    const razorpayOptions = {
      amount: Math.round(calculatedTotal * 100), // Amount in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId.substring(0, 5)}`,
      payment_capture: 1
    };

    const razorpayOrder = await razorpay.orders.create(razorpayOptions);

    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount: calculatedTotal,
      razorpayOrderId: razorpayOrder.id,
      status: 'PENDING'
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error(`[PaymentRoutes] Create Order Failure: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate payment order.',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payment/verify-payment
 * @desc    Cryptographic HMAC-SHA256 signature verification and stock decrement
 * @access  Private (Firebase Auth)
 */
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing mandatory payment verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature.'
      });
    }

    const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: `Order record not found for Razorpay Order ID: ${razorpay_order_id}`
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured on server.');
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isSignatureValid) {
      existingOrder.status = 'FAILED';
      await existingOrder.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: cryptographic signature mismatch.'
      });
    }

    existingOrder.status = 'PAID';
    existingOrder.razorpayPaymentId = razorpay_payment_id;
    await existingOrder.save();

    // Decrement inventory stock atomically for each ordered product
    for (const item of existingOrder.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    return res.status(200).json({
      success: true,
      orderId: existingOrder._id,
      message: 'Payment verified and order finalized successfully.'
    });
  } catch (error) {
    console.error(`[PaymentRoutes] Verify Payment Failure: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment verification.',
      error: error.message
    });
  }
});

module.exports = router;
