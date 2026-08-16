const express = require('express');
const ingredientController = require('../controllers/ingredientController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  adjustIngredientValidators,
  createIngredientValidators,
  ingredientIdValidators,
  listIngredientTransactionValidators,
  listIngredientValidators,
  updateIngredientValidators,
} = require('../validators/ingredientValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', listIngredientValidators, ingredientController.listIngredients);
router.get('/transactions', listIngredientTransactionValidators, ingredientController.listIngredientTransactions);
router.post('/adjustment', requireRole('owner'), adjustIngredientValidators, ingredientController.adjustIngredientStock);
router.get('/:id', ingredientIdValidators, ingredientController.getIngredient);
router.post('/', requireRole('owner'), createIngredientValidators, ingredientController.createIngredient);
router.put('/:id', requireRole('owner'), updateIngredientValidators, ingredientController.updateIngredient);
router.delete('/:id', requireRole('owner'), ingredientIdValidators, ingredientController.deleteIngredient);

module.exports = router;

