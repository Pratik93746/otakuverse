const orderService = require('../services/order.service');
const { successResponse, errorResponse } = require('../utils/response');

const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, customer, couponCode } = req.body;
    const paymentMethod = String(req.body.paymentMethod || 'RAZORPAY').toUpperCase() === 'COD' ? 'COD' : 'RAZORPAY';
    const currency = 'INR'; // Financial invariant: store currency is strictly INR
    if (!req.user || !req.user.uid) return errorResponse(res, 'Unauthorized.', 401, 'AUTH_UNAUTHORIZED');
    const userId = req.user.uid;

    // Contact email comes from the verified Firebase token; the browser only supplies name and phone.
    const order = await orderService.createOrder(
      userId,
      {
        name: customer && typeof customer.name === 'string' ? customer.name.trim().slice(0, 100) : undefined,
        phone: customer && typeof customer.phone === 'string' ? customer.phone.trim().slice(0, 20) : undefined,
        email: req.user.email || '',
      },
      items,
      shippingAddress,
      couponCode,
      currency,
      paymentMethod
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
