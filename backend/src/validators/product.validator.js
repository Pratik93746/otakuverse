const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  // Strip dangerous mongodb operator characters, trim, cap to 100 chars, and escape regex special characters to prevent ReDoS
  const clean = val.replace(/^\$/, '').trim().slice(0, 100);
  return clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const validateProductQuery = (req) => {
  const { minPrice, maxPrice, limit, page } = req.query;

  if (minPrice !== undefined && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
    return 'minPrice must be a non-negative number.';
  }
  if (maxPrice !== undefined && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
    return 'maxPrice must be a non-negative number.';
  }
  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    return 'minPrice cannot exceed maxPrice.';
  }
  if (limit !== undefined && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) < 1)) {
    return 'limit must be a positive integer.';
  }
  if (page !== undefined && (isNaN(parseInt(page, 10)) || parseInt(page, 10) < 1)) {
    return 'page must be a positive integer.';
  }

  return null;
};

const validateProductBody = (req) => {
  const { name, price, stock } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Product name is required and must be a string.';
  }
  if (name.length > 200) return 'Product name is too long.';
  if (price === undefined || isNaN(Number(price)) || Number(price) <= 0 || Number(price) > 1000000) {
    return 'Product price is required and must be between 0 and 1,000,000.';
  }
  if (stock !== undefined && (isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0)) {
    return 'Stock must be a non-negative integer.';
  }
  return null;
};

module.exports = {
  sanitizeString,
  validateProductQuery,
  validateProductBody,
};
