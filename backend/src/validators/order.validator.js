const validateOrderCreate = (req) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return 'Order creation requires a non-empty items array.';
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.productId) {
      return `Item at index ${i} is missing productId.`;
    }
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return `Item at index ${i} has an invalid quantity. Must be at least 1.`;
    }
  }

  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return 'Complete shippingAddress object is required.';
  }

  const { fullName, phone, addressLine1, city, state, pinCode } = shippingAddress;

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return 'Shipping address fullName is required.';
  }

  const cleanPhone = (phone || '').trim().replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return 'A valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 is required.';
  }

  if (!addressLine1 || typeof addressLine1 !== 'string' || addressLine1.trim().length < 5) {
    return 'Shipping address street line must be at least 5 characters.';
  }

  if (!city || typeof city !== 'string' || !city.trim()) {
    return 'Shipping address city is required.';
  }

  if (!state || typeof state !== 'string' || !state.trim()) {
    return 'Shipping address state is required.';
  }

  const cleanPin = (pinCode || '').trim().replace(/\D/g, '');
  if (!/^[1-9]\d{5}$/.test(cleanPin)) {
    return 'A valid 6-digit Indian postal PIN code is required.';
  }

  // Reject untrusted client discount parameters
  if (req.body.discount !== undefined && Number(req.body.discount) > 0) {
    return 'Arbitrary client discount values are not permitted. Please provide a valid couponCode instead.';
  }

  if (req.body.couponCode && (typeof req.body.couponCode !== 'string' || req.body.couponCode.trim().length > 32)) {
    return 'couponCode must be a valid string up to 32 characters.';
  }

  return null;
};

module.exports = {
  validateOrderCreate,
};
