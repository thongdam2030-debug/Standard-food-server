const recipeService = require('../services/recipeService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listRecipes = asyncHandler(async (req, res) => {
  const result = await recipeService.listRecipes(req.query);
  return sendList(res, result.data, result.pagination);
});

const getRecipe = asyncHandler(async (req, res) => sendSuccess(res, await recipeService.getRecipeById(req.params.id)));
const upsertRecipe = asyncHandler(async (req, res) => sendSuccess(res, await recipeService.upsertRecipe(req.body), 'Recipe saved', 201));
const updateRecipe = asyncHandler(async (req, res) => sendSuccess(res, await recipeService.updateRecipe(req.params.id, req.body), 'Recipe updated'));
const deleteRecipe = asyncHandler(async (req, res) => sendSuccess(res, await recipeService.deleteRecipe(req.params.id), 'Recipe deleted'));
const syncRecipeCost = asyncHandler(async (req, res) => sendSuccess(res, await recipeService.syncRecipeCostToProduct(req.params.id), 'Recipe cost synced'));

module.exports = { deleteRecipe, getRecipe, listRecipes, syncRecipeCost, updateRecipe, upsertRecipe };
