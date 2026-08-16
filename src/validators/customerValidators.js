const { body, param, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const customerBodyValidators = [
  body('name')
    .isString()
    .withMessage('name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 200 })
    .withMessage('name must be 200 characters or fewer'),
  body('phone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }).withMessage('phone must be 50 characters or fewer'),
  body('address').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('address must be 1000 characters or fewer'),
];

const listCustomerValidators = [
  ...paginationValidators,
  query('q').optional().isString().trim(),
  query('sortBy').optional().isIn(['name', 'phone', 'createdAt', 'updatedAt']).withMessage('sortBy is invalid'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidation,
];


const creditBillValidators = [
  validateObjectId('id'),
  body('title').isString().withMessage('title is required').bail().trim().notEmpty().withMessage('title is required').isLength({ max: 200 }).withMessage('title must be 200 characters or fewer'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('billNumber').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('billNumber must be 100 characters or fewer'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('items').optional().isArray({ min: 1 }).withMessage('items must be an array'),
  body('items.*.title').optional().isString().trim().notEmpty().withMessage('item title is required'),
  body('items.*.amount').optional().isFloat({ gt: 0 }).withMessage('item amount must be greater than 0'),
  handleValidation,
];

const creditBillIdValidators = [
  validateObjectId('id'),
  param('billId').isMongoId().withMessage('Invalid billId'),
  handleValidation,
];

const depositedItemValidators = [
  validateObjectId('id'),
  body('itemName').isString().withMessage('itemName is required').bail().trim().notEmpty().withMessage('itemName is required').isLength({ max: 200 }).withMessage('itemName must be 200 characters or fewer'),
  body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('items').optional().isArray({ min: 1 }).withMessage('items must be an array'),
  body('items.*.title').optional().isString().trim().notEmpty().withMessage('item title is required'),
  body('items.*.amount').optional().isFloat({ gt: 0 }).withMessage('item amount must be greater than 0'),
  handleValidation,
];

const depositedItemIdValidators = [
  validateObjectId('id'),
  param('itemId').isMongoId().withMessage('Invalid itemId'),
  handleValidation,
];
const createCustomerValidators = [...customerBodyValidators, handleValidation];
const updateCustomerValidators = [validateObjectId('id'), ...customerBodyValidators, handleValidation];
const customerIdValidators = [validateObjectId('id'), handleValidation];

module.exports = {
  createCustomerValidators,
  creditBillIdValidators,
  creditBillValidators,
  customerIdValidators,
  depositedItemIdValidators,
  depositedItemValidators,
  listCustomerValidators,
  updateCustomerValidators,
};


