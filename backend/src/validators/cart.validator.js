const mongoose = require('mongoose');

const validateCartItem = (req) => {
  const { productId, quantity } = req.body;
  if (!productId) {
    return 'productId is required.';
  }
  if (!mongoose.Types.ObjectId.isValid(productId) && typeof productId !== 'string') {
    return 'Invalid productId format.';
  }
  if (quantity !== undefined && (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 1)) {
    return 'quantity must be a positive integer.';
  }
  return null;
};

const validateCartUpdate = (req) => {
  const { quantity } = req.body;
  if (quantity === undefined || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0) {
    return 'quantity must be a non-negative integer.';
  }
  return null;
};

module.exports = {
  validateCartItem,
  validateCartUpdate,
};
