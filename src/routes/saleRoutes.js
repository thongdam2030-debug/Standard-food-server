const express = require('express');
const saleController = require('../controllers/saleController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', saleController.listSales);
router.post('/close', saleController.closeSale);
router.post('/import', saleController.importSale);

module.exports = router;

