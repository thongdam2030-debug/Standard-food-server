const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { adjustStockValidators, listInventoryValidators } = require('../validators/inventoryValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/transactions', listInventoryValidators, inventoryController.listTransactions);
router.post('/adjustment', requireRole('owner'), adjustStockValidators, inventoryController.adjustStock);

module.exports = router;
