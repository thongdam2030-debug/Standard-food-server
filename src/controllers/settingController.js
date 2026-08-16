const settingService = require('../services/settingService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getSettings = asyncHandler(async (req, res) => sendSuccess(res, await settingService.getSettings()));
const updateSettings = asyncHandler(async (req, res) => sendSuccess(res, await settingService.updateSettings(req.body), 'Settings updated'));

module.exports = { getSettings, updateSettings };
