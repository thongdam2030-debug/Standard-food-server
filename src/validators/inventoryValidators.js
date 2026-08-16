const { body, query } = require('express-validator');
const { handleValidation, paginationValidators } = require('../middleware/validation');

const transactionTypes = ['PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];
const directions = ['IN', 'OUT'];

const listInventoryValidators = [
  ...paginationValidators,
  query('productId').optional({ values: 'falsy' }).isMongoId().withMessage('productId must be a valid id'),
  query('type').optional({ values: 'falsy' }).isIn(transactionTypes).withMessage('type is invalid'),
  query('direction').optional({ values: 'falsy' }).isIn(directions).withMessage('direction is invalid'),
  handleValidation,
];

const adjustStockValidators = [
  body('productId').isMongoId().withMessage('productId must be a valid id'),
  body('type').isIn(transactionTypes.filter((type) => type !== 'SALE')).withMessage('type is invalid'),
  body('direction').optional({ values: 'falsy' }).isIn(directions).withMessage('direction is invalid'),
  body('quantity').isFloat({ min: 0.000001 }).withMessage('quantity must be greater than 0'),
  body('unitCost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('unitCost must be greater than or equal to 0'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  handleValidation,
];

module.exports = { adjustStockValidators, listInventoryValidators };
