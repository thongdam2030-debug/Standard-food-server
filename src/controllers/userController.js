const userService = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.query);
  return sendList(res, result.data, result.pagination);
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  return sendSuccess(res, user, 'User created', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user._id);
  return sendSuccess(res, user, 'User updated');
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id, req.user._id);
  return sendSuccess(res, result, 'User deactivated');
});

module.exports = { createUser, deleteUser, listUsers, updateUser };
