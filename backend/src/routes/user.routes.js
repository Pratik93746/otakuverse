const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { validateProfileUpdate } = require('../validators/auth.validator');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(validateProfileUpdate), userController.updateMe);
router.get('/me/orders', userController.getMyOrders);

module.exports = router;
