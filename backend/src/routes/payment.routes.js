const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/authenticate');
const { paymentLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public webhook endpoint directly called by Razorpay servers (verified via x-razorpay-signature header)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Protected endpoints called by authenticated users
router.use(paymentLimiter);
router.use(authenticate);

router.post('/create-order', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
