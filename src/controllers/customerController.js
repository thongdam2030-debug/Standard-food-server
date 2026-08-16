const customerService = require('../services/customerService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.query);
  return sendList(res, result.data, result.pagination);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return sendSuccess(res, customer);
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  return sendSuccess(res, customer, 'Customer created', 201);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  return sendSuccess(res, customer, 'Customer updated');
});

const addCreditBill = asyncHandler(async (req, res) => {
  const customer = await customerService.addCreditBill(req.params.id, req.body);
  return sendSuccess(res, customer, 'Credit bill created', 201);
});

const markCreditBillPaid = asyncHandler(async (req, res) => {
  const customer = await customerService.markCreditBillPaid(req.params.id, req.params.billId);
  return sendSuccess(res, customer, 'Credit bill paid');
});

const addDepositedItem = asyncHandler(async (req, res) => {
  const customer = await customerService.addDepositedItem(req.params.id, req.body);
  return sendSuccess(res, customer, 'Deposited item created', 201);
});

const markDepositedItemReturned = asyncHandler(async (req, res) => {
  const customer = await customerService.markDepositedItemReturned(req.params.id, req.params.itemId);
  return sendSuccess(res, customer, 'Deposited item returned');
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.deleteCustomer(req.params.id);
  return sendSuccess(res, result, 'Customer deleted');
});

module.exports = {
  addCreditBill,
  addDepositedItem,
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  markCreditBillPaid,
  markDepositedItemReturned,
  updateCustomer,
};
