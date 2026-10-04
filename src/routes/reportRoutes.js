const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { profitReportValidators } = require('../validators/reportValidators');

const router = express.Router();

router.use(requireAuth);
router.get('/dashboard/today', requireRole('owner'), reportController.getDashboardTodayReport);
router.get('/sales', requireRole('owner', 'cashier'), reportController.getSalesReport);
router.get('/staff/:staffId', requireRole('owner', 'cashier'), reportController.getStaffSalesReport);
router.get('/staff/:staffId/invoices/:invoiceId', requireRole('owner', 'cashier'), reportController.getStaffInvoiceReport);
router.get('/profit', requireRole('owner'), profitReportValidators, reportController.getProfitReport);

module.exports = router;