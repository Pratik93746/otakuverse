const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Retrieve all products with optional category filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      filter.category = String(category).toLowerCase().trim();
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error(`[ProductRoutes] Error fetching products: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching products.',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Retrieve a single product by MongoDB ObjectId
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: ${id}`
      });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`[ProductRoutes] Error fetching product ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching product.',
      error: error.message
    });
  }
});

module.exports = router;
