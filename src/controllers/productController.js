const productService = require('../services/productService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  return sendList(res, result.data, result.pagination);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return sendSuccess(res, product);
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  return sendSuccess(res, product, 'Product created', 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return sendSuccess(res, product, 'Product updated');
});


const decreaseProductStock = asyncHandler(async (req, res) => {
  const products = await productService.decreaseProductStock(req.body.items);
  return sendSuccess(res, products, 'Product stock updated');
});
const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);
  return sendSuccess(res, result, 'Product deactivated');
});

module.exports = {
  createProduct,
  decreaseProductStock,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
};

