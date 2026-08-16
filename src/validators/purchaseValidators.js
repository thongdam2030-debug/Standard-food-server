const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const purchaseItemValidators = [
  body('items').isArray({ min: 1 }).withMessage('items must have at least one item'),
  body('items.*.productId').isMongoId().withMessage('items.productId must be valid'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('items.quantity must be greater than 0'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('items.unitCost must be 0 or greater'),
];

const createPurchaseValidators = [
  body('supplierId').isMongoId().withMessage('supplierId must be valid'),
  ...purchaseItemValidators,
  body('discount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('discount must be 0 or greater'),
  body('paidAmount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('paidAmount must be 0 or greater'),
  body('purchaseDate').optional({ values: 'falsy' }).isISO8601().withMessage('purchaseDate must be a valid date'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('status').optional({ values: 'falsy' }).isIn(['DRAFT', 'ORDERED']).withMessage('status is invalid'),
  body('paymentStatus').optional({ values: 'falsy' }).isIn(['UNPAID', 'PARTIAL', 'PAID']).withMessage('paymentStatus is invalid'),
  handleValidation,
];

const listPurchaseValidators = [
  ...paginationValidators,
  query('supplierId').optional({ values: 'falsy' }).isMongoId().withMessage('supplierId must be valid'),
  query('status').optional().isIn(['all', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED']).withMessage('status is invalid'),
  query('paymentStatus').optional().isIn(['all', 'UNPAID', 'PARTIAL', 'PAID']).withMessage('paymentStatus is invalid'),
  query('dateFrom').optional({ values: 'falsy' }).isISO8601().withMessage('dateFrom must be a valid date'),
  query('dateTo').optional({ values: 'falsy' }).isISO8601().withMessage('dateTo must be a valid date'),
  handleValidation,
];

const updatePaymentValidators = [
  validateObjectId('id'),
  body('paidAmount').isFloat({ min: 0 }).withMessage('paidAmount must be 0 or greater'),
  handleValidation,
];

const purchaseIdValidators = [validateObjectId('id'), handleValidation];

module.exports = {
  createPurchaseValidators,
  listPurchaseValidators,
  purchaseIdValidators,
  updatePaymentValidators,
};
