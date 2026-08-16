const express = require('express');
const tableController = require('../controllers/tableController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createTableValidators, listTableValidators, tableIdValidators, updateTableValidators } = require('../validators/tableValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', listTableValidators, tableController.listTables);
router.post('/', requireRole('owner'), createTableValidators, tableController.createTable);
router.put('/:id', requireRole('owner'), updateTableValidators, tableController.updateTable);
router.delete('/:id', requireRole('owner'), tableIdValidators, tableController.deleteTable);

module.exports = router;
