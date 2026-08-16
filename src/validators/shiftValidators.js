const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

const openShiftValidators = [
  body('openingCash').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('openingCash must be greater than or equal to 0'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('note must be 1000 characters or fewer'),
  handleValidation,
];

const closeShiftValidators = [
  body('closingCash').isFloat({ min: 0 }).withMessage('closingCash must be greater than or equal to 0'),
  body('closingNote').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }).withMessage('closingNote must be 1000 characters or fewer'),
  handleValidation,
];

module.exports = { closeShiftValidators, openShiftValidators };
