const express = require('express');
const cartController = require('../controllers/cartController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', cartController.getCart);
router.post('/items', cartController.addCartItem);
router.put('/items/:cartItemId', cartController.setCartItemQuantity);
router.delete('/items/:cartItemId', cartController.removeCartItem);
router.put('/discount', cartController.setCartDiscount);
router.put('/service-charge', cartController.setCartServiceChargeRate);
router.put('/vat', cartController.setCartVatRate);
router.put('/table', cartController.setCartTableNumber);
router.post('/tables/open', cartController.openTable);
router.post('/tables/reserve', cartController.reserveTable);
router.post('/tables/cancel-reservation', cartController.cancelTableReservation);
router.post('/tables/cancel-open', cartController.cancelOpenTable);
router.post('/tables/move', cartController.moveTable);
router.post('/tables/merge', cartController.mergeTables);
router.delete('/', cartController.clearCart);

module.exports = router;
