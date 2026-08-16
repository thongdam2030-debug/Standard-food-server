const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { profitReportValidators } = require('../validators/reportValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));
router.get('/profit', profitReportValidators, reportController.getProfitReport);

module.exports = router;
