const reportService = require('../services/reportService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getProfitReport = asyncHandler(async (req, res) => {
  return sendSuccess(res, await reportService.getProfitReport(req.query));
});

module.exports = { getProfitReport };
