const express = require('express');
const saleController = require('../controllers/saleController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', saleController.listOrders);
router.post('/', saleController.createOrder);
router.patch('/:id/status', saleController.updateOrderStatus);

module.exports = router;


