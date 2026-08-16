const authService = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.username, req.body.password);
  return sendSuccess(res, result, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, authService.sanitizeUser(req.user));
});

module.exports = { getMe, login };
