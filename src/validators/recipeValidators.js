const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const recipeBodyValidators = [
  body('productId').isMongoId().withMessage('productId must be valid'),
  body('items').isArray({ min: 1 }).withMessage('items must have at least one item'),
  body('items.*.ingredientId').isMongoId().withMessage('ingredientId must be valid'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const listRecipeValidators = [
  ...paginationValidators,
  query('productId').optional({ values: 'falsy' }).isMongoId().withMessage('productId must be valid'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  handleValidation,
];

const upsertRecipeValidators = [...recipeBodyValidators, handleValidation];
const updateRecipeValidators = [validateObjectId('id'), ...recipeBodyValidators, handleValidation];
const recipeIdValidators = [validateObjectId('id'), handleValidation];

module.exports = { listRecipeValidators, recipeIdValidators, updateRecipeValidators, upsertRecipeValidators };
