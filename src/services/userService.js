const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { sanitizeUser } = require('./authService');

async function ensureUniqueUsername(username, ignoreId) {
  const existingUser = await User.findOne({ username: username.trim().toLowerCase() }).lean();

  if (existingUser && String(existingUser._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Username already exists');
  }
}

async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query);
  const [users, total] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments({}),
  ]);

  return {
    data: users.map(sanitizeUser),
    pagination: createPagination(page, limit, total),
  };
}

async function createUser(values) {
  await ensureUniqueUsername(values.username);
  const passwordHash = await User.hashPassword(values.password);
  const user = await User.create({
    name: values.name.trim(),
    username: values.username.trim().toLowerCase(),
    passwordHash,
    role: values.role,
    defaultRoute: values.defaultRoute || '/pos',
    isActive: values.isActive ?? true,
  });

  return sanitizeUser(user);
}

async function updateUser(id, values, currentUserId) {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await ensureUniqueUsername(values.username, id);
  user.name = values.name.trim();
  user.username = values.username.trim().toLowerCase();
  user.role = values.role;
  user.defaultRoute = values.defaultRoute || '/pos';

  if (values.isActive !== undefined) {
    if (String(user._id) === String(currentUserId) && values.isActive === false) {
      throw new ApiError(400, 'You cannot deactivate your own account');
    }

    user.isActive = values.isActive;
  }

  if (values.password) {
    user.passwordHash = await User.hashPassword(values.password);
  }

  await user.save();
  return sanitizeUser(user);
}

async function deleteUser(id, currentUserId) {
  if (String(id) === String(currentUserId)) {
    throw new ApiError(400, 'You cannot deactivate your own account');
  }

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.isActive = false;
  await user.save();
  return { deactivated: true };
}

module.exports = { createUser, deleteUser, listUsers, updateUser };
