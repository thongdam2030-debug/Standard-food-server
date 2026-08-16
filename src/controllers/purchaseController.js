const purchaseService = require('../services/purchaseService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listPurchases = asyncHandler(async (req, res) => {
  const result = await purchaseService.listPurchases(req.query);
  return sendList(res, result.data, result.pagination);
});

const getPurchase = asyncHandler(async (req, res) => {
  return sendSuccess(res, await purchaseService.getPurchaseById(req.params.id));
});

const createPurchase = asyncHandler(async (req, res) => {
  return sendSuccess(res, await purchaseService.createPurchase(req.user, req.body), 'Purchase created', 201);
});

const receivePurchase = asyncHandler(async (req, res) => {
  return sendSuccess(res, await purchaseService.receivePurchase(req.user, req.params.id), 'Purchase received');
});

const updatePurchasePayment = asyncHandler(async (req, res) => {
  return sendSuccess(res, await purchaseService.updatePaymentStatus(req.params.id, req.body), 'Purchase payment updated');
});

const cancelPurchase = asyncHandler(async (req, res) => {
  return sendSuccess(res, await purchaseService.cancelPurchase(req.params.id), 'Purchase cancelled');
});

module.exports = {
  cancelPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  receivePurchase,
  updatePurchasePayment,
};
