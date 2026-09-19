const userService = require('../services/user.service');
const orderService = require('../services/order.service');
const { successResponse, errorResponse } = require('../utils/response');

const getMe = async (req, res, next) => {
  try {
    let profile = await userService.getProfile(req.user.uid);
    if (!profile) {
      profile = await userService.syncUser(req.user);
    }
    return successResponse(res, profile, 200);
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user.uid, req.body);
    return successResponse(res, updated, 200);
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getUserOrders(req.user.uid, req.query);
    return successResponse(res, result.orders, 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  getMyOrders,
};
