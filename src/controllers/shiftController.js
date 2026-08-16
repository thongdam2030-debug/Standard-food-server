const shiftService = require('../services/shiftService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listShifts = asyncHandler(async (req, res) => sendList(res, await shiftService.listShifts(req.user)));
const getCurrentShift = asyncHandler(async (req, res) => sendSuccess(res, await shiftService.getOpenShiftForUser(req.user)));
const openShift = asyncHandler(async (req, res) => sendSuccess(res, await shiftService.openShift(req.user, req.body), 'Shift opened', 201));
const closeShift = asyncHandler(async (req, res) => sendSuccess(res, await shiftService.closeShift(req.user, req.body), 'Shift closed'));

module.exports = { closeShift, getCurrentShift, listShifts, openShift };
