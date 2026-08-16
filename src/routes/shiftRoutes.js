const express = require('express');
const shiftController = require('../controllers/shiftController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { closeShiftValidators, openShiftValidators } = require('../validators/shiftValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', shiftController.listShifts);
router.get('/current', shiftController.getCurrentShift);
router.post('/open', openShiftValidators, shiftController.openShift);
router.post('/close', closeShiftValidators, shiftController.closeShift);

module.exports = router;
