const ingredientService = require('../services/ingredientService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listIngredients = asyncHandler(async (req, res) => {
  const result = await ingredientService.listIngredients(req.query);
  return sendList(res, result.data, result.pagination);
});

const listIngredientTransactions = asyncHandler(async (req, res) => {
  const result = await ingredientService.listIngredientTransactions(req.query);
  return sendList(res, result.data, result.pagination);
});

const adjustIngredientStock = asyncHandler(async (req, res) => sendSuccess(res, await ingredientService.adjustIngredientStock(req.user, req.body), 'Ingredient stock adjusted', 201));

const getIngredient = asyncHandler(async (req, res) => sendSuccess(res, await ingredientService.getIngredientById(req.params.id)));
const createIngredient = asyncHandler(async (req, res) => sendSuccess(res, await ingredientService.createIngredient(req.body), 'Ingredient created', 201));
const updateIngredient = asyncHandler(async (req, res) => sendSuccess(res, await ingredientService.updateIngredient(req.params.id, req.body), 'Ingredient updated'));
const deleteIngredient = asyncHandler(async (req, res) => sendSuccess(res, await ingredientService.deleteIngredient(req.params.id), 'Ingredient deleted'));

module.exports = { adjustIngredientStock, createIngredient, deleteIngredient, getIngredient, listIngredients, listIngredientTransactions, updateIngredient };

