const express = require('express');
const supplierController = require('../controllers/supplierController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  createSupplierValidators,
  listSupplierValidators,
  supplierIdValidators,
  updateSupplierValidators,
} = require('../validators/supplierValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', listSupplierValidators, supplierController.listSuppliers);
router.get('/:id', supplierIdValidators, supplierController.getSupplier);
router.post('/', requireRole('owner'), createSupplierValidators, supplierController.createSupplier);
router.put('/:id', requireRole('owner'), updateSupplierValidators, supplierController.updateSupplier);
router.delete('/:id', requireRole('owner'), supplierIdValidators, supplierController.deleteSupplier);

module.exports = router;
