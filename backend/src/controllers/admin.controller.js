const productService = require('../services/product.service');
const orderService = require('../services/order.service');
const userService = require('../services/user.service');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { successResponse, errorResponse } = require('../utils/response');
const { getPagination, formatPagination } = require('../utils/pagination');

// Products Management
const getProducts = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20, 50);
    const filter = {};

    if (req.query.search) {
      const s = req.query.search.trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { slug: { $regex: s, $options: 'i' } },
        { brand: { $regex: s, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    return successResponse(res, products, 200, { pagination: formatPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, product, 201);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) {
      return errorResponse(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }
    return successResponse(res, product, 200);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const success = await productService.deleteProduct(req.params.id);
    if (!success) {
      return errorResponse(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }
    return successResponse(res, { message: 'Product permanently removed from catalog and storage.' }, 200);
  } catch (error) {
    next(error);
  }
};

// Orders Management
const getOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrdersAdmin(req.query);
    return successResponse(res, result.orders, 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id, null, true);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');
    }
    return successResponse(res, order, 200);
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, tracking } = req.body;
    if (!status) {
      return errorResponse(res, 'Status is required.', 400, 'STATUS_REQUIRED');
    }

    const order = await orderService.updateOrderStatus(req.params.id, status, tracking);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');
    }
    return successResponse(res, order, 200);
  } catch (error) {
    next(error);
  }
};

// Users Management
const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsersAdmin(req.query);
    return successResponse(res, result.users, 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// High-Performance Fast Analytics (Section 29: no dumping entire collections to memory!)
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const [
      totalProducts,
      activeProducts,
      lowStockCount,
      totalOrders,
      paidOrdersCount,
      totalUsers,
      activeCarts,
      revenueResult,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ stock: { $lte: 5 }, isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: 'PAID' }),
      User.countDocuments(),
      Cart.countDocuments({ 'items.0': { $exists: true } }),
      Order.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult && revenueResult[0] ? revenueResult[0].totalRevenue : 0;

    return successResponse(res, {
      totalProducts,
      activeProducts,
      lowStockCount,
      totalOrders,
      paidOrdersCount,
      totalUsers,
      activeCarts,
      totalRevenue,
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getUsers,
  getDashboardAnalytics,
};
