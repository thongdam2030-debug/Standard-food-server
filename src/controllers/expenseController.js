const expenseService = require('../services/expenseService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listExpenses = asyncHandler(async (req, res) => {
  const result = await expenseService.listExpenses(req.user, req.query);
  return sendList(res, result.data, result.pagination);
});

const getExpenseSummary = asyncHandler(async (req, res) => sendSuccess(res, await expenseService.getExpenseSummary(req.user, req.query)));
const createExpense = asyncHandler(async (req, res) => sendSuccess(res, await expenseService.createExpense(req.user, req.body), 'Expense created', 201));
const updateExpense = asyncHandler(async (req, res) => sendSuccess(res, await expenseService.updateExpense(req.user, req.params.id, req.body), 'Expense updated'));
const deleteExpense = asyncHandler(async (req, res) => sendSuccess(res, await expenseService.deleteExpense(req.user, req.params.id), 'Expense deleted'));

module.exports = { createExpense, deleteExpense, getExpenseSummary, listExpenses, updateExpense };
