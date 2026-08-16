const express = require('express');
const recipeController = require('../controllers/recipeController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  listRecipeValidators,
  recipeIdValidators,
  updateRecipeValidators,
  upsertRecipeValidators,
} = require('../validators/recipeValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', listRecipeValidators, recipeController.listRecipes);
router.get('/:id', recipeIdValidators, recipeController.getRecipe);
router.post('/', requireRole('owner'), upsertRecipeValidators, recipeController.upsertRecipe);
router.put('/:id', requireRole('owner'), updateRecipeValidators, recipeController.updateRecipe);
router.patch('/:id/sync-cost', requireRole('owner'), recipeIdValidators, recipeController.syncRecipeCost);
router.delete('/:id', requireRole('owner'), recipeIdValidators, recipeController.deleteRecipe);

module.exports = router;
