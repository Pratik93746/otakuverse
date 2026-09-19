const productService = require('../services/product.service');
const { successResponse, errorResponse } = require('../utils/response');

const getProducts = async (req, res, next) => {
  try {
    const result = await productService.getProducts(req.query);
    return successResponse(res, result.products, 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }
    return successResponse(res, product, 200);
  } catch (error) {
    next(error);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    if (!product) {
      return errorResponse(res, 'Product not found with specified slug.', 404, 'PRODUCT_NOT_FOUND');
    }
    return successResponse(res, product, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
};
