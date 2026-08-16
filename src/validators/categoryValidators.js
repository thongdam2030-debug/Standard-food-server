const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const categoryBodyValidators = [
  body('name')
    .isString()
    .withMessage('name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 100 })
    .withMessage('name must be 100 characters or fewer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const listCategoryValidators = [
  ...paginationValidators,
  query('q').optional().isString().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  handleValidation,
];

const createCategoryValidators = [...categoryBodyValidators, handleValidation];
const updateCategoryValidators = [validateObjectId('id'), ...categoryBodyValidators, handleValidation];
const categoryIdValidators = [validateObjectId('id'), handleValidation];

module.exports = {
  categoryIdValidators,
  createCategoryValidators,
  listCategoryValidators,
  updateCategoryValidators,
};
