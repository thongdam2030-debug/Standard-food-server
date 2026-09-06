const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { config } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

function sanitizeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    role: user.role,
    defaultRoute: user.defaultRoute || '/pos',
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function login(username, password) {
  const user = await User.findOne({ username: username.trim().toLowerCase() });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid username or password');
  }

  return {
    token: signToken(user),
    user: sanitizeUser(user),
  };
}

module.exports = { login, sanitizeUser };
