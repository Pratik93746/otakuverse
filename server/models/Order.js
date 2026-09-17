const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference ID is required']
    },
    title: {
      type: String,
      required: [true, 'Product title snapshot is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: [true, 'Unit price snapshot is required'],
      min: [0, 'Unit price cannot be negative']
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'Firebase user ID is required'],
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order must contain at least one item'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'Order items array cannot be empty'
      }
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total order amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      unique: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'PAID', 'FAILED'],
        message: '{VALUE} is not a valid order status'
      },
      default: 'PENDING',
      index: true
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
