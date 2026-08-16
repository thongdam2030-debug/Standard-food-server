const categoryService = require('../services/categoryService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.listCategories(req.query);
  return sendList(res, result.data, result.pagination);
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  return sendSuccess(res, category);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return sendSuccess(res, category, 'Category created', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return sendSuccess(res, category, 'Category updated');
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.id);
  return sendSuccess(res, result, result.deactivated ? 'Category deactivated' : 'Category deleted');
});

module.exports = {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
};
