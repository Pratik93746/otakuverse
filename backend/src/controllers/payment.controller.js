const paymentService = require('../services/payment.service');
const { successResponse, errorResponse } = require('../utils/response');

const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return errorResponse(res, 'orderId is required.', 400, 'ORDER_ID_REQUIRED');
    }

    const result = await paymentService.createRazorpayOrder(orderId, req.user.uid);
    return successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id, payment_id, signature } = req.body;

    const rzpOrderId = razorpay_order_id || order_id;
    const rzpPaymentId = razorpay_payment_id || payment_id;
    const rzpSig = razorpay_signature || signature;

    if (!rzpOrderId || !rzpPaymentId || !rzpSig) {
      return errorResponse(
        res,
        'Missing mandatory payment verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature.',
        400,
        'VERIFICATION_FIELDS_MISSING'
      );
    }

    const result = await paymentService.verifyPayment(rzpOrderId, rzpPaymentId, rzpSig);
    return successResponse(res, result, 200);
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await paymentService.handleWebhook(req.body, signature);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
};
