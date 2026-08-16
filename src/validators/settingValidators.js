const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

const updateSettingValidators = [
  body('storeName').isString().trim().notEmpty().withMessage('storeName is required').isLength({ max: 160 }).withMessage('storeName must be 160 characters or fewer'),
  body('phone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 80 }).withMessage('phone must be 80 characters or fewer'),
  body('address').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }).withMessage('address must be 500 characters or fewer'),
  body('currencyCode').isString().trim().isLength({ min: 3, max: 3 }).withMessage('currencyCode must be 3 characters'),
  body('currencyLocale').isString().trim().notEmpty().withMessage('currencyLocale is required').isLength({ max: 35 }).withMessage('currencyLocale must be 35 characters or fewer'),
  body('defaultVatRate').isFloat({ min: 0, max: 100 }).withMessage('defaultVatRate must be between 0 and 100'),
  body('defaultServiceChargeRate').isFloat({ min: 0, max: 100 }).withMessage('defaultServiceChargeRate must be between 0 and 100'),
  body('lowStockThreshold').isFloat({ min: 0 }).withMessage('lowStockThreshold must be greater than or equal to 0'),
  body('receiptFooter').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }).withMessage('receiptFooter must be 500 characters or fewer'),
  handleValidation,
];

module.exports = { updateSettingValidators };
