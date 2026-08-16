const Expense = require('../models/Expense');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { escapeRegex } = require('../utils/strings');

const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'];

function sanitizeUser(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createExpenseNumber(date = new Date()) {
  const dateKey = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
  const timeKey = [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0'), String(date.getSeconds()).padStart(2, '0')].join('');
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `EXP-${dateKey}-${timeKey}-${suffix}`;
}

function mapExpense(expense) {
  const plainExpense = typeof expense.toObject === 'function' ? expense.toObject() : expense;
  return {
    id: String(plainExpense._id),
    expenseNumber: plainExpense.expenseNumber,
    category: plainExpense.category,
    title: plainExpense.title,
    amount: plainExpense.amount,
    paidBy: plainExpense.paidBy,
    expenseDate: plainExpense.expenseDate,
    note: plainExpense.note,
    reference: plainExpense.reference,
    user: plainExpense.user,
    createdAt: plainExpense.createdAt,
    updatedAt: plainExpense.updatedAt,
  };
}

function buildFilter(user, query = {}) {
  const filter = user.role === 'owner' ? {} : { 'user.id': String(user._id || user.id) };

  if (query.category) {
    filter.category = normalizeText(query.category);
  }

  if (query.paidBy) {
    filter.paidBy = query.paidBy;
  }

  if (query.dateFrom || query.dateTo) {
    filter.expenseDate = {};
    if (query.dateFrom) filter.expenseDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filter.expenseDate.$lte = dateTo;
    }
  }

  if (query.q) {
    const regex = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
    filter.$or = [{ title: regex }, { category: regex }, { note: regex }, { reference: regex }];
  }

  return filter;
}

async function listExpenses(user, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(user, query);
  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(filter),
  ]);

  return {
    data: expenses.map(mapExpense),
    pagination: createPagination(page, limit, total),
  };
}

async function getExpenseSummary(user, query) {
  const filter = buildFilter(user, query);
  const expenses = await Expense.find(filter).lean();
  const byCategory = expenses.reduce((summary, expense) => {
    summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
    return summary;
  }, {});
  const byPaidBy = expenses.reduce((summary, expense) => {
    summary[expense.paidBy] = (summary[expense.paidBy] || 0) + expense.amount;
    return summary;
  }, {});

  return {
    byCategory,
    byPaidBy,
    count: expenses.length,
    total: expenses.reduce((total, expense) => total + expense.amount, 0),
  };
}

async function createExpense(user, values) {
  const amount = toNumber(values.amount);
  if (amount <= 0) {
    throw new ApiError(400, 'Expense amount must be greater than 0');
  }

  const category = normalizeText(values.category);
  const title = normalizeText(values.title);
  if (!category || !title) {
    throw new ApiError(400, 'Expense category and title are required');
  }

  const expense = await Expense.create({
    amount,
    category,
    expenseDate: values.expenseDate ? new Date(values.expenseDate) : new Date(),
    expenseNumber: createExpenseNumber(),
    note: normalizeText(values.note),
    paidBy: paymentMethods.includes(values.paidBy) ? values.paidBy : 'CASH',
    reference: normalizeText(values.reference),
    title,
    user: sanitizeUser(user),
  });

  return mapExpense(expense);
}

async function updateExpense(user, id, values) {
  const filter = user.role === 'owner' ? { _id: id } : { _id: id, 'user.id': String(user._id || user.id) };
  const expense = await Expense.findOne(filter);

  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  const amount = toNumber(values.amount);
  if (amount <= 0) {
    throw new ApiError(400, 'Expense amount must be greater than 0');
  }

  expense.amount = amount;
  expense.category = normalizeText(values.category);
  expense.expenseDate = values.expenseDate ? new Date(values.expenseDate) : expense.expenseDate;
  expense.note = normalizeText(values.note);
  expense.paidBy = paymentMethods.includes(values.paidBy) ? values.paidBy : expense.paidBy;
  expense.reference = normalizeText(values.reference);
  expense.title = normalizeText(values.title);
  await expense.save();

  return mapExpense(expense);
}

async function deleteExpense(user, id) {
  const filter = user.role === 'owner' ? { _id: id } : { _id: id, 'user.id': String(user._id || user.id) };
  const expense = await Expense.findOne(filter);

  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  await expense.deleteOne();
  return { deleted: true };
}

module.exports = { createExpense, deleteExpense, getExpenseSummary, listExpenses, updateExpense };
