const express = require('express');
const cartController = require('../controllers/cart.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { validateCartItem, validateCartUpdate } = require('../validators/cart.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(validateCartItem), cartController.addItem);
router.patch('/items/:productId', validate(validateCartUpdate), cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
