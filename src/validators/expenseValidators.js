const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const paidByValues = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'];

const expenseBodyValidators = [
  body('category').isString().trim().notEmpty().withMessage('category is required').isLength({ max: 100 }).withMessage('category must be 100 characters or fewer'),
  body('title').isString().trim().notEmpty().withMessage('title is required').isLength({ max: 200 }).withMessage('title must be 200 characters or fewer'),
  body('amount').isFloat({ min: 0.000001 }).withMessage('amount must be greater than 0'),
  body('paidBy').optional({ values: 'falsy' }).isIn(paidByValues).withMessage('paidBy is invalid'),
  body('expenseDate').optional({ values: 'falsy' }).isISO8601().withMessage('expenseDate must be a valid date'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('reference').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }).withMessage('reference must be 200 characters or fewer'),
];

const listExpenseValidators = [
  ...paginationValidators,
  query('q').optional({ values: 'falsy' }).isString().trim(),
  query('category').optional({ values: 'falsy' }).isString().trim(),
  query('paidBy').optional({ values: 'falsy' }).isIn(paidByValues).withMessage('paidBy is invalid'),
  query('dateFrom').optional({ values: 'falsy' }).isISO8601().withMessage('dateFrom must be a valid date'),
  query('dateTo').optional({ values: 'falsy' }).isISO8601().withMessage('dateTo must be a valid date'),
  handleValidation,
];

const createExpenseValidators = [...expenseBodyValidators, handleValidation];
const updateExpenseValidators = [validateObjectId('id'), ...expenseBodyValidators, handleValidation];
const expenseIdValidators = [validateObjectId('id'), handleValidation];

module.exports = { createExpenseValidators, expenseIdValidators, listExpenseValidators, updateExpenseValidators };
