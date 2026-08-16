const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginValidators } = require('../validators/userValidators');

const router = express.Router();

router.post('/login', loginValidators, authController.login);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
