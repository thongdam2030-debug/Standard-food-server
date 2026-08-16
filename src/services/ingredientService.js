const Ingredient = require('../models/Ingredient');
const IngredientTransaction = require('../models/IngredientTransaction');
const Supplier = require('../models/Supplier');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { escapeRegex, normalizeOptionalString } = require('../utils/strings');

function sanitizeUser(user = {}) {
  return {
    id: String(user._id || user.id || ''),
    name: user.name || '',
    username: user.username || '',
    role: user.role || '',
  };
}

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function mapIngredientTransaction(transaction) {
  const plainTransaction = typeof transaction.toObject === 'function' ? transaction.toObject() : transaction;
  return {
    ...plainTransaction,
    id: String(plainTransaction._id),
    ingredientId: String(plainTransaction.ingredientId),
  };
}

function mapIngredient(ingredient) {
  const plainIngredient = typeof ingredient.toObject === 'function' ? ingredient.toObject() : ingredient;
  return {
    ...plainIngredient,
    id: String(plainIngredient._id),
    supplierId: plainIngredient.supplierId ? String(plainIngredient.supplierId) : '',
  };
}

async function ensureUniqueName(name, ignoreId) {
  const existingIngredient = await Ingredient.findOne({ name: name.trim() }).lean();
  if (existingIngredient && String(existingIngredient._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Ingredient name already exists');
  }
}

async function buildPayload(values) {
  let supplierId = null;
  let supplierName = '';

  if (values.supplierId) {
    const supplier = await Supplier.findById(values.supplierId).lean();
    if (!supplier) throw new ApiError(404, 'Supplier not found');
    supplierId = supplier._id;
    supplierName = supplier.name;
  }

  return {
    isActive: values.isActive !== undefined ? Boolean(values.isActive) : true,
    minStock: Math.max(toNumber(values.minStock), 0),
    name: values.name.trim(),
    note: normalizeOptionalString(values.note),
    sku: normalizeOptionalString(values.sku),
    stock: Math.max(toNumber(values.stock), 0),
    supplierId,
    supplierName,
    unit: normalizeOptionalString(values.unit) || 'unit',
    unitCost: Math.max(toNumber(values.unitCost), 0),
  };
}

async function listIngredients(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;
  if (query.q) {
    const regex = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
    filter.$or = [{ name: regex }, { sku: regex }, { supplierName: regex }];
  }

  const [ingredients, total] = await Promise.all([
    Ingredient.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Ingredient.countDocuments(filter),
  ]);

  return { data: ingredients.map(mapIngredient), pagination: createPagination(page, limit, total) };
}

async function getIngredientById(id) {
  const ingredient = await Ingredient.findById(id).lean();
  if (!ingredient) throw new ApiError(404, 'Ingredient not found');
  return mapIngredient(ingredient);
}

async function createIngredient(values) {
  await ensureUniqueName(values.name);
  const ingredient = await Ingredient.create(await buildPayload(values));
  return mapIngredient(ingredient);
}

async function updateIngredient(id, values) {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) throw new ApiError(404, 'Ingredient not found');
  await ensureUniqueName(values.name, id);
  Object.assign(ingredient, await buildPayload(values));
  await ingredient.save();
  return mapIngredient(ingredient);
}


async function listIngredientTransactions(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.ingredientId) filter.ingredientId = query.ingredientId;
  if (query.type && query.type !== 'all') filter.type = query.type;
  if (query.direction && query.direction !== 'all') filter.direction = query.direction;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = dateTo;
    }
  }

  const [transactions, total] = await Promise.all([
    IngredientTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    IngredientTransaction.countDocuments(filter),
  ]);

  return { data: transactions.map(mapIngredientTransaction), pagination: createPagination(page, limit, total) };
}

async function adjustIngredientStock(user, values) {
  const ingredient = await Ingredient.findById(values.ingredientId);
  if (!ingredient) throw new ApiError(404, 'Ingredient not found');

  const quantity = Math.max(toNumber(values.quantity), 0);
  if (quantity <= 0) throw new ApiError(400, 'Quantity must be greater than 0');

  const direction = values.direction === 'OUT' ? 'OUT' : 'IN';
  const type = ['PURCHASE', 'ADJUSTMENT', 'WASTE'].includes(values.type) ? values.type : 'ADJUSTMENT';
  const stockBefore = toNumber(ingredient.stock);
  const stockAfter = direction === 'IN' ? stockBefore + quantity : Math.max(stockBefore - quantity, 0);
  const unitCost = Math.max(toNumber(values.unitCost ?? ingredient.unitCost), 0);

  ingredient.stock = stockAfter;
  ingredient.unitCost = unitCost;
  await ingredient.save();

  const transaction = await IngredientTransaction.create({
    direction,
    ingredientId: ingredient._id,
    ingredientName: ingredient.name,
    productId: '',
    productName: '',
    quantity,
    referenceId: normalizeOptionalString(values.referenceId),
    referenceType: normalizeOptionalString(values.referenceType || 'MANUAL'),
    stockAfter,
    stockBefore,
    totalCost: quantity * unitCost,
    type,
    unit: ingredient.unit,
    unitCost,
    user: sanitizeUser(user),
  });

  return mapIngredientTransaction(transaction);
}
async function deleteIngredient(id) {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) throw new ApiError(404, 'Ingredient not found');
  ingredient.isActive = false;
  await ingredient.save();
  return { deleted: true };
}

module.exports = { adjustIngredientStock, createIngredient, deleteIngredient, getIngredientById, listIngredients, listIngredientTransactions, updateIngredient };

