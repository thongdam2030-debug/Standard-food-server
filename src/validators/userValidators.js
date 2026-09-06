const { body } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const loginValidators = [
  body('username').isString().trim().notEmpty().withMessage('username is required'),
  body('password').isString().notEmpty().withMessage('password is required'),
  handleValidation,
];

const userBodyValidators = [
  body('name').isString().trim().notEmpty().withMessage('name is required').isLength({ max: 200 }).withMessage('name must be 200 characters or fewer'),
  body('username').isString().trim().notEmpty().withMessage('username is required').isLength({ max: 100 }).withMessage('username must be 100 characters or fewer'),
  body('password').optional({ values: 'falsy' }).isString().isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role').isIn(['owner', 'cashier']).withMessage('role must be owner or cashier'),
  body('defaultRoute').optional().isIn(['/pos', '/kitchen']).withMessage('defaultRoute must be /pos or /kitchen'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const createUserValidators = [
  ...userBodyValidators,
  body('password').isString().isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  handleValidation,
];
const updateUserValidators = [validateObjectId('id'), ...userBodyValidators, handleValidation];
const userIdValidators = [validateObjectId('id'), handleValidation];
const listUserValidators = [...paginationValidators, handleValidation];

module.exports = { createUserValidators, listUserValidators, loginValidators, updateUserValidators, userIdValidators };
