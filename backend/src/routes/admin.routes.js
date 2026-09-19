const express = require('express');
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const validate = require('../middleware/validate');
const { validateProductBody } = require('../validators/product.validator');

const router = express.Router();

// Enforce both authenticate and authorizeAdmin for all admin routes (Section 25)
router.use(authenticate);
router.use(authorizeAdmin);

// Products
router.get('/products', adminController.getProducts);
router.post('/products', validate(validateProductBody), adminController.createProduct);
router.patch('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Orders
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderById);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// Users
router.get('/users', adminController.getUsers);

// Analytics
router.get('/analytics', adminController.getDashboardAnalytics);

module.exports = router;
