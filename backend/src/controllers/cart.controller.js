const cartService = require('../services/cart.service');
const { successResponse, errorResponse } = require('../utils/response');

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.uid);
    return successResponse(res, cart, 200);
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const cart = await cartService.addItem(req.user.uid, productId, quantity);
    return successResponse(res, cart, 201);
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItemQuantity(req.user.uid, productId, quantity);
    return successResponse(res, cart, 200);
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await cartService.removeItem(req.user.uid, productId);
    return successResponse(res, cart, 200);
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const result = await cartService.clearCart(req.user.uid);
    return successResponse(res, result, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
