const reportService = require('../services/reportService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getDashboardTodayReport = asyncHandler(async (req, res) => {
  const report = await reportService.getDashboardTodayReport();
  res.set('Cache-Control', 'private, max-age=30');
  res.set('X-Dashboard-Cache', report.cache?.hit ? 'HIT' : 'MISS');
  return sendSuccess(res, report);
});

const getSalesReport = asyncHandler(async (req, res) => {
  return sendSuccess(res, await reportService.getSalesReport(req.query));
});

const getStaffSalesReport = asyncHandler(async (req, res) => {
  return sendSuccess(res, await reportService.getStaffSalesReport(req.params.staffId, req.query));
});

const getStaffInvoiceReport = asyncHandler(async (req, res) => {
  return sendSuccess(res, await reportService.getStaffInvoiceReport(req.params.staffId, req.params.invoiceId));
});
const getProfitReport = asyncHandler(async (req, res) => {
  return sendSuccess(res, await reportService.getProfitReport(req.query));
});

module.exports = { getDashboardTodayReport, getProfitReport, getSalesReport, getStaffInvoiceReport, getStaffSalesReport };

