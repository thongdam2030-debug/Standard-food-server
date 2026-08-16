const { body, query } = require('express-validator');
const { handleValidation, paginationValidators, validateObjectId } = require('../middleware/validation');

const supplierBodyValidators = [
  body('name')
    .isString()
    .withMessage('name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 200 })
    .withMessage('name must be 200 characters or fewer'),
  body('contactPerson').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }).withMessage('contactPerson must be 200 characters or fewer'),
  body('phone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }).withMessage('phone must be 50 characters or fewer'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('email must be valid').bail().normalizeEmail(),
  body('address').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('address must be 1000 characters or fewer'),
  body('taxId').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('taxId must be 100 characters or fewer'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const listSupplierValidators = [
  ...paginationValidators,
  query('q').optional().isString().trim(),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('sortBy').optional().isIn(['name', 'phone', 'email', 'createdAt', 'updatedAt']).withMessage('sortBy is invalid'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidation,
];

const createSupplierValidators = [...supplierBodyValidators, handleValidation];
const updateSupplierValidators = [validateObjectId('id'), ...supplierBodyValidators, handleValidation];
const supplierIdValidators = [validateObjectId('id'), handleValidation];

module.exports = {
  createSupplierValidators,
  listSupplierValidators,
  supplierIdValidators,
  updateSupplierValidators,
};
