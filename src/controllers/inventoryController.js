const inventoryService = require('../services/inventoryService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listTransactions = asyncHandler(async (req, res) => {
  const result = await inventoryService.listTransactions(req.query);
  return sendList(res, result.data, result.pagination);
});

const adjustStock = asyncHandler(async (req, res) => {
  const transaction = await inventoryService.adjustStock(req.user, req.body);
  return sendSuccess(res, transaction, 'Inventory transaction created', 201);
});

module.exports = { adjustStock, listTransactions };
