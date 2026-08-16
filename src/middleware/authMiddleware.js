const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { config } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication required');
  }

  let payload;

  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub).lean();

  if (!user || !user.isActive) {
    throw new ApiError(401, 'User is inactive or no longer exists');
  }

  req.user = user;
  return next();
});

function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Permission denied'));
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
