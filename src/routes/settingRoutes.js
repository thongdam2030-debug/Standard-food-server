const express = require('express');
const settingController = require('../controllers/settingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { updateSettingValidators } = require('../validators/settingValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));
router.get('/', settingController.getSettings);
router.put('/', updateSettingValidators, settingController.updateSettings);

module.exports = router;
