const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createUserValidators, listUserValidators, updateUserValidators, userIdValidators } = require('../validators/userValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', listUserValidators, userController.listUsers);
router.post('/', requireRole('owner'), createUserValidators, userController.createUser);
router.put('/:id', requireRole('owner'), updateUserValidators, userController.updateUser);
router.delete('/:id', requireRole('owner'), userIdValidators, userController.deleteUser);

module.exports = router;

