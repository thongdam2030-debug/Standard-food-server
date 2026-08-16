const { body } = require('express-validator');
const { handleValidation, validateObjectId } = require('../middleware/validation');

const cartItemValidators = [
  body('productId').isMongoId().withMessage('productId must be a valid id'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  handleValidation,
];

const cartQuantityValidators = [
  validateObjectId('productId'),
  body('quantity').isInt({ min: 0 }).withMessage('quantity must be 0 or greater'),
  handleValidation,
];

const cartProductIdValidators = [validateObjectId('productId'), handleValidation];

const cartDiscountValidators = [
  body('discount').isFloat({ min: 0 }).withMessage('discount must be a number greater than or equal to 0'),
  handleValidation,
];

module.exports = { cartDiscountValidators, cartItemValidators, cartProductIdValidators, cartQuantityValidators };
