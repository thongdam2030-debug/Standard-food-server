const { config } = require('../config/env');
const { sendError } = require('../utils/response');

function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || error.status || 500;
  let message = statusCode === 500 && config.env === 'production'
    ? 'Internal server error'
    : error.message || 'Internal server error';
  let errors = error.errors || [];

  if (error.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    message = fields.length > 0 ? `${fields.join(', ')} already exists` : 'Duplicate value already exists';
    errors = fields.map((field) => ({ field, message }));
  }

  if (config.env !== 'test') {
    console.error(error);
  }

  if (res.headersSent) {
    return next(error);
  }

  return sendError(res, message, statusCode, errors);
}

module.exports = { errorHandler };
