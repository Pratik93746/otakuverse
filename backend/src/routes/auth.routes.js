const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { validateProfileUpdate, validateAddress } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/sync', authLimiter, authenticate, authController.syncProfile);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(validateProfileUpdate), authController.updateMe);
router.post('/addresses', authenticate, validate(validateAddress), authController.addAddress);

module.exports = router;
