const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');
const IngredientTransaction = require('../models/IngredientTransaction');
const Product = require('../models/Product');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { normalizeOptionalString } = require('../utils/strings');

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function mapRecipe(recipe) {
  const plainRecipe = typeof recipe.toObject === 'function' ? recipe.toObject() : recipe;
  return {
    ...plainRecipe,
    id: String(plainRecipe._id),
    productId: String(plainRecipe.productId),
    items: (plainRecipe.items || []).map((item) => ({ ...item, ingredientId: String(item.ingredientId) })),
  };
}

async function resolveRecipeItems(items = []) {
  const resolvedItems = [];

  for (const item of items) {
    const ingredient = await Ingredient.findById(item.ingredientId).lean();
    if (!ingredient || !ingredient.isActive) throw new ApiError(404, `Active ingredient not found: ${item.ingredientId}`);

    const quantity = Math.max(toNumber(item.quantity), 0);
    if (quantity <= 0) throw new ApiError(400, 'Recipe item quantity must be greater than 0');

    const unitCost = Math.max(toNumber(ingredient.unitCost), 0);
    resolvedItems.push({
      ingredientId: ingredient._id,
      ingredientName: ingredient.name,
      quantity,
      totalCost: quantity * unitCost,
      unit: ingredient.unit,
      unitCost,
    });
  }

  if (!resolvedItems.length) throw new ApiError(400, 'Recipe must have at least one ingredient');
  return resolvedItems;
}

async function listRecipes(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.productId) filter.productId = query.productId;
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Recipe.countDocuments(filter),
  ]);

  return { data: recipes.map(mapRecipe), pagination: createPagination(page, limit, total) };
}

async function getRecipeById(id) {
  const recipe = await Recipe.findById(id).lean();
  if (!recipe) throw new ApiError(404, 'Recipe not found');
  return mapRecipe(recipe);
}

async function upsertRecipe(values) {
  const product = await Product.findById(values.productId).lean();
  if (!product) throw new ApiError(404, 'Product not found');

  const items = await resolveRecipeItems(values.items);
  const totalCost = items.reduce((total, item) => total + item.totalCost, 0);
  const payload = {
    isActive: values.isActive !== undefined ? Boolean(values.isActive) : true,
    items,
    note: normalizeOptionalString(values.note),
    productId: product._id,
    productName: product.name,
    totalCost,
  };

  const recipe = await Recipe.findOneAndUpdate({ productId: product._id }, payload, { new: true, runValidators: true, upsert: true });
  return mapRecipe(recipe);
}

async function updateRecipe(id, values) {
  const recipe = await Recipe.findById(id);
  if (!recipe) throw new ApiError(404, 'Recipe not found');
  return upsertRecipe({ ...values, productId: values.productId || recipe.productId });
}

async function deleteRecipe(id) {
  const recipe = await Recipe.findById(id);
  if (!recipe) throw new ApiError(404, 'Recipe not found');
  recipe.isActive = false;
  await recipe.save();
  return mapRecipe(recipe);
}

async function syncRecipeCostToProduct(id) {
  const recipe = await Recipe.findById(id);
  if (!recipe) throw new ApiError(404, 'Recipe not found');

  const product = await Product.findById(recipe.productId);
  if (!product) throw new ApiError(404, 'Product not found');

  product.cost = recipe.totalCost;
  await product.save();
  return { productId: String(product._id), productName: product.name, cost: product.cost, recipe: mapRecipe(recipe) };
}


function sanitizeUser(user = {}) {
  return {
    id: String(user._id || user.id || ''),
    name: user.name || '',
    username: user.username || '',
    role: user.role || '',
  };
}

async function recordSaleConsumption(user, sale) {
  const saleItems = sale.items || [];
  if (!saleItems.length) return [];

  const productIds = saleItems.map((item) => item.productId).filter(Boolean);
  const recipes = await Recipe.find({ productId: { $in: productIds }, isActive: true }).lean();
  if (!recipes.length) return [];

  const saleQuantityByProduct = new Map();
  saleItems.forEach((item) => {
    const key = String(item.productId);
    saleQuantityByProduct.set(key, (saleQuantityByProduct.get(key) || 0) + toNumber(item.quantity));
  });

  const documents = [];

  for (const recipe of recipes) {
    const saleQuantity = saleQuantityByProduct.get(String(recipe.productId)) || 0;
    if (saleQuantity <= 0) continue;

    for (const recipeItem of recipe.items || []) {
      const ingredient = await Ingredient.findById(recipeItem.ingredientId);
      if (!ingredient) continue;

      const quantity = toNumber(recipeItem.quantity) * saleQuantity;
      if (quantity <= 0) continue;

      const stockBefore = toNumber(ingredient.stock);
      const stockAfter = Math.max(stockBefore - quantity, 0);
      const unitCost = toNumber(ingredient.unitCost);

      ingredient.stock = stockAfter;
      await ingredient.save();

      documents.push({
        direction: 'OUT',
        ingredientId: ingredient._id,
        ingredientName: ingredient.name,
        productId: String(recipe.productId),
        productName: recipe.productName,
        quantity,
        referenceId: String(sale._id),
        referenceType: 'SALE',
        stockAfter,
        stockBefore,
        totalCost: unitCost * quantity,
        type: 'SALE',
        unit: ingredient.unit,
        unitCost,
        user: sanitizeUser(user),
      });
    }
  }

  if (!documents.length) return [];
  return IngredientTransaction.insertMany(documents);
}

module.exports = { deleteRecipe, getRecipeById, listRecipes, recordSaleConsumption, syncRecipeCostToProduct, updateRecipe, upsertRecipe };

