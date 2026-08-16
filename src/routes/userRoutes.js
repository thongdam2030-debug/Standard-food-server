const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createUserValidators, listUserValidators, updateUserValidators, userIdValidators } = require('../validators/userValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner'));
router.get('/', listUserValidators, userController.listUsers);
router.post('/', createUserValidators, userController.createUser);
router.put('/:id', updateUserValidators, userController.updateUser);
router.delete('/:id', userIdValidators, userController.deleteUser);

module.exports = router;
