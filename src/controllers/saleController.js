const saleService = require('../services/saleService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listSales = asyncHandler(async (req, res) => sendList(res, await saleService.listSales(req.user)));
const listOrders = asyncHandler(async (req, res) => sendList(res, await saleService.listOrders(req.user)));
const createOrder = asyncHandler(async (req, res) => sendSuccess(res, await saleService.createOrder(req.user, req.body), 'Order created', 201));
const listPayments = asyncHandler(async (req, res) => sendList(res, await saleService.listPayments(req.user)));
const updateOrderStatus = asyncHandler(async (req, res) => sendSuccess(res, await saleService.updateOrderStatus(req.user, req.params.id, req.body.status), 'Order status updated'));
const updateOrderItemStatus = asyncHandler(async (req, res) => sendSuccess(res, await saleService.updateOrderItemStatus(req.user, req.params.id, req.body.itemKey, req.body.status), 'Order item status updated'));
const closeSale = asyncHandler(async (req, res) => sendSuccess(res, await saleService.closeSale(req.user, req.body), 'Sale closed', 201));
const importSale = asyncHandler(async (req, res) => sendSuccess(res, await saleService.importSale(req.user, req.body), 'Sale imported', 201));

module.exports = { closeSale, createOrder, importSale, listOrders, listPayments, listSales, updateOrderItemStatus, updateOrderStatus };