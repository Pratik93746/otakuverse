const express = require('express');
const orderController = require('../controllers/order.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { validateOrderCreate } = require('../validators/order.validator');
const { paymentLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authenticate);

router.post('/', paymentLimiter, validate(validateOrderCreate), orderController.createOrder);
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);

module.exports = router;
