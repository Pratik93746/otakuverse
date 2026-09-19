const userService = require('../services/user.service');
const { successResponse, errorResponse } = require('../utils/response');

const syncProfile = async (req, res, next) => {
  try {
    const user = await userService.syncUser(req.user);
    return successResponse(res, user, 200);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    let user = await userService.getProfile(req.user.uid);
    if (!user) {
      user = await userService.syncUser(req.user);
    }
    return successResponse(res, user, 200);
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

const addAddress = async (req, res, next) => {
  try {
    const addresses = await userService.addAddress(req.user.uid, req.body);
    return successResponse(res, { addresses }, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncProfile,
  getMe,
  updateMe,
  addAddress,
};
