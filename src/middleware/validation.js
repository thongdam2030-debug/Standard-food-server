const mongoose = require('mongoose');
const { param, query, validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

function handleValidation(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((error) => ({
    field: error.path,
    message: error.msg,
    value: error.value,
  }));

  return next(new ApiError(400, 'Validation error', errors));
}

function validateObjectId(paramName = 'id') {
  return param(paramName).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid id');
    }

    return true;
  });
}

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

module.exports = { handleValidation, paginationValidators, validateObjectId };
