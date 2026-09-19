const express = require('express');
const productController = require('../controllers/product.controller');
const validate = require('../middleware/validate');
const { validateProductQuery } = require('../validators/product.validator');

const router = express.Router();

router.get('/', validate(validateProductQuery), productController.getProducts);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/:id', productController.getProductById);

module.exports = router;
