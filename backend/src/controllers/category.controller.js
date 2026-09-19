const Category = require('../models/Category');
const { successResponse, errorResponse } = require('../utils/response');

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    return successResponse(res, categories, 200);
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
      isActive: true,
    }).lean();

    if (!category) {
      return errorResponse(res, 'Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }
    return successResponse(res, category, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
};
