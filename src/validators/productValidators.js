const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const productBodyValidators = [
  body('barcode').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('barcode must be 100 characters or fewer'),
  body('name')
    .isString()
    .withMessage('name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 200 })
    .withMessage('name must be 200 characters or fewer'),
  body('categoryId').optional({ values: 'falsy' }).isMongoId().withMessage('categoryId must be a valid id'),
  body('categoryName').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('categoryName must be 100 characters or fewer'),
  body('price').isFloat({ min: 0 }).withMessage('price must be a number greater than or equal to 0'),
  body('cost').isFloat({ min: 0 }).withMessage('cost must be a number greater than or equal to 0'),
  body('stock').isFloat({ min: 0 }).withMessage('stock must be a number greater than or equal to 0'),
  body('image').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }).withMessage('image must be 2000 characters or fewer'),
  body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 5000 }).withMessage('description must be 5000 characters or fewer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const listProductValidators = [
  ...paginationValidators,
  query('q').optional().isString().trim(),
  query('categoryId').optional({ values: 'falsy' }).isMongoId().withMessage('categoryId must be a valid id'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('sortBy').optional().isIn(['name', 'categoryName', 'price', 'cost', 'stock', 'createdAt', 'updatedAt']).withMessage('sortBy is invalid'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidation,
];


const decreaseProductStockValidators = [
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.productId').isMongoId().withMessage('productId must be a valid id'),
  body('items.*.quantity').isFloat({ min: 0.000001 }).withMessage('quantity must be greater than 0'),
  handleValidation,
];
const createProductValidators = [...productBodyValidators, handleValidation];
const updateProductValidators = [validateObjectId('id'), ...productBodyValidators, handleValidation];
const productIdValidators = [validateObjectId('id'), handleValidation];

module.exports = {
  createProductValidators,
  decreaseProductStockValidators,
  listProductValidators,
  productIdValidators,
  updateProductValidators,
};

