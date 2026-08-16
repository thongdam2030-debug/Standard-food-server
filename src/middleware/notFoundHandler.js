const { sendError } = require('../utils/response');

function notFoundHandler(req, res) {
  return sendError(res, `Route not found: ${req.originalUrl}`, 404);
}

module.exports = { notFoundHandler };
