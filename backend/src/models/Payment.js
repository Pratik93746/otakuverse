const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference ID is required'],
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'Order Number is required'],
      index: true,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    provider: {
      type: String,
      default: 'razorpay',
      trim: true,
    },
    providerOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CAPTURED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ providerOrderId: 1, providerPaymentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
