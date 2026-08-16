const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  createPurchaseValidators,
  listPurchaseValidators,
  purchaseIdValidators,
  updatePaymentValidators,
} = require('../validators/purchaseValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));
router.get('/', listPurchaseValidators, purchaseController.listPurchases);
router.get('/:id', purchaseIdValidators, purchaseController.getPurchase);
router.post('/', createPurchaseValidators, purchaseController.createPurchase);
router.post('/:id/receive', purchaseIdValidators, purchaseController.receivePurchase);
router.patch('/:id/payment', updatePaymentValidators, purchaseController.updatePurchasePayment);
router.patch('/:id/cancel', purchaseIdValidators, purchaseController.cancelPurchase);

module.exports = router;
