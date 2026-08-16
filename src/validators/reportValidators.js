const { query } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

const profitReportValidators = [
  query('dateFrom').optional({ values: 'falsy' }).isISO8601().withMessage('dateFrom must be a valid date'),
  query('dateTo').optional({ values: 'falsy' }).isISO8601().withMessage('dateTo must be a valid date'),
  handleValidation,
];

module.exports = { profitReportValidators };
