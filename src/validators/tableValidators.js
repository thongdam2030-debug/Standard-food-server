const { body, query } = require('express-validator');
const { handleValidation, validateObjectId } = require('../middleware/validation');

const tableBodyValidators = [
  body('number').isInt({ min: 1 }).withMessage('number must be a positive integer'),
  body('name').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('name must be 100 characters or fewer'),
  body('zone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('zone must be 100 characters or fewer'),
  body('capacity').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('capacity must be between 1 and 100'),
  body('sortOrder').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('sortOrder must be greater than or equal to 0'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

const listTableValidators = [
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('zone').optional({ values: 'falsy' }).isString().trim(),
  handleValidation,
];

const createTableValidators = [...tableBodyValidators, handleValidation];
const updateTableValidators = [validateObjectId('id'), ...tableBodyValidators, handleValidation];
const tableIdValidators = [validateObjectId('id'), handleValidation];

module.exports = { createTableValidators, listTableValidators, tableIdValidators, updateTableValidators };
