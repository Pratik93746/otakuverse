const orderService = require('../services/order.service');
const { successResponse, errorResponse } = require('../utils/response');

const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, customer, discount = 0, currency = 'INR' } = req.body;
    const userId = req.user ? req.user.uid : `guest_${Date.now()}`;

    const order = await orderService.createOrder(
      userId,
      customer,
      items,
      shippingAddress,
      discount,
      currency
    );

    return successResponse(res, order, 201);
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const result = await orderService.getUserOrders(req.user.uid, req.query);
    return successResponse(res, result.orders, 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const order = await orderService.getOrderById(req.params.id, req.user.uid, isAdmin);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');
    }
    return successResponse(res, order, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
};
