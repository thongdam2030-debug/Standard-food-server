const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const ingredientBodyValidators = [
  body('name').isString().withMessage('name is required').bail().trim().notEmpty().withMessage('name is required').isLength({ max: 200 }).withMessage('name must be 200 characters or fewer'),
  body('sku').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('sku must be 100 characters or fewer'),
  body('unit').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }).withMessage('unit must be 50 characters or fewer'),
  body('unitCost').isFloat({ min: 0 }).withMessage('unitCost must be 0 or greater'),
  body('stock').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('stock must be 0 or greater'),
  body('minStock').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('minStock must be 0 or greater'),
  body('supplierId').optional({ values: 'falsy' }).isMongoId().withMessage('supplierId must be valid'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const listIngredientValidators = [
  ...paginationValidators,
  query('q').optional().isString().trim(),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  handleValidation,
];

const listIngredientTransactionValidators = [
  ...paginationValidators,
  query('ingredientId').optional({ values: 'falsy' }).isMongoId().withMessage('ingredientId must be valid'),
  query('type').optional().isIn(['all', 'SALE', 'ADJUSTMENT', 'PURCHASE', 'WASTE']).withMessage('type is invalid'),
  query('direction').optional().isIn(['all', 'IN', 'OUT']).withMessage('direction is invalid'),
  query('dateFrom').optional({ values: 'falsy' }).isISO8601().withMessage('dateFrom must be a valid date'),
  query('dateTo').optional({ values: 'falsy' }).isISO8601().withMessage('dateTo must be a valid date'),
  handleValidation,
];

const adjustIngredientValidators = [
  body('ingredientId').isMongoId().withMessage('ingredientId must be valid'),
  body('type').optional({ values: 'falsy' }).isIn(['ADJUSTMENT', 'PURCHASE', 'WASTE']).withMessage('type is invalid'),
  body('direction').isIn(['IN', 'OUT']).withMessage('direction must be IN or OUT'),
  body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('unitCost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('unitCost must be 0 or greater'),
  body('referenceType').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('referenceType must be 100 characters or fewer'),
  body('referenceId').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }).withMessage('referenceId must be 200 characters or fewer'),
  handleValidation,
];

const createIngredientValidators = [...ingredientBodyValidators, handleValidation];
const updateIngredientValidators = [validateObjectId('id'), ...ingredientBodyValidators, handleValidation];
const ingredientIdValidators = [validateObjectId('id'), handleValidation];

module.exports = { adjustIngredientValidators, createIngredientValidators, ingredientIdValidators, listIngredientTransactionValidators, listIngredientValidators, updateIngredientValidators };

