const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');

const stockInTypes = ['PURCHASE', 'RETURN'];
const stockOutTypes = ['SALE', 'WASTE', 'TRANSFER'];
const transactionTypes = ['PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];
const directions = ['IN', 'OUT'];

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

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveDirection(type, direction) {
  if (directions.includes(direction)) {
    return direction;
  }

  if (stockInTypes.includes(type)) {
    return 'IN';
  }

  if (stockOutTypes.includes(type)) {
    return 'OUT';
  }

  return 'IN';
}

function mapInventoryTransaction(transaction) {
  const plainTransaction = typeof transaction.toObject === 'function' ? transaction.toObject() : transaction;
  return {
    id: String(plainTransaction._id),
    productId: String(plainTransaction.productId),
    productName: plainTransaction.productName,
    barcode: plainTransaction.barcode,
    categoryName: plainTransaction.categoryName,
    type: plainTransaction.type,
    direction: plainTransaction.direction,
    quantity: plainTransaction.quantity,
    stockBefore: plainTransaction.stockBefore,
    stockAfter: plainTransaction.stockAfter,
    unitCost: plainTransaction.unitCost,
    totalCost: plainTransaction.totalCost,
    referenceType: plainTransaction.referenceType,
    referenceId: plainTransaction.referenceId,
    note: plainTransaction.note,
    user: plainTransaction.user,
    createdAt: plainTransaction.createdAt,
    updatedAt: plainTransaction.updatedAt,
  };
}

function buildFilter(query = {}) {
  const filter = {};

  if (query.productId) {
    filter.productId = query.productId;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.direction) {
    filter.direction = query.direction;
  }

  return filter;
}

async function listTransactions(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(query);

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    InventoryTransaction.countDocuments(filter),
  ]);

  return {
    data: transactions.map(mapInventoryTransaction),
    pagination: createPagination(page, limit, total),
  };
}

async function createTransactionFromProduct(user, product, values) {
  const type = transactionTypes.includes(values.type) ? values.type : 'ADJUSTMENT';
  const direction = resolveDirection(type, values.direction);
  const quantity = Math.max(toNumber(values.quantity), 0);

  if (quantity <= 0) {
    throw new ApiError(400, 'Quantity must be greater than 0');
  }

  const stockBefore = toNumber(product.stock);
  const stockAfter = direction === 'IN' ? stockBefore + quantity : Math.max(stockBefore - quantity, 0);
  const unitCost = Math.max(toNumber(values.unitCost ?? product.cost), 0);

  product.stock = stockAfter;
  await product.save();

  const transaction = await InventoryTransaction.create({
    barcode: product.barcode,
    categoryName: product.categoryName,
    direction,
    note: normalizeText(values.note),
    productId: product._id,
    productName: product.name,
    quantity,
    referenceId: normalizeText(values.referenceId),
    referenceType: normalizeText(values.referenceType || 'MANUAL'),
    stockAfter,
    stockBefore,
    totalCost: unitCost * quantity,
    type,
    unitCost,
    user: sanitizeUser(user),
  });

  return mapInventoryTransaction(transaction);
}

async function adjustStock(user, values) {
  const product = await Product.findById(values.productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return createTransactionFromProduct(user, product, values);
}

async function recordSaleTransactions(user, stockMovements, saleId) {
  if (!stockMovements.length) {
    return [];
  }

  const documents = stockMovements.map((movement) => ({
    barcode: movement.product.barcode,
    categoryName: movement.product.categoryName,
    direction: 'OUT',
    note: '',
    productId: movement.product._id,
    productName: movement.product.name,
    quantity: movement.quantity,
    referenceId: String(saleId),
    referenceType: 'SALE',
    stockAfter: movement.stockAfter,
    stockBefore: movement.stockBefore,
    totalCost: toNumber(movement.product.cost) * movement.quantity,
    type: 'SALE',
    unitCost: toNumber(movement.product.cost),
    user: sanitizeUser(user),
  }));

  const transactions = await InventoryTransaction.insertMany(documents);
  return transactions.map(mapInventoryTransaction);
}


async function recordPurchaseTransactions(user, purchase, purchaseItems) {
  if (!purchaseItems.length) {
    return [];
  }

  const documents = [];

  for (const item of purchaseItems) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }

    const quantity = Math.max(toNumber(item.quantity), 0);
    const unitCost = Math.max(toNumber(item.unitCost), 0);
    const stockBefore = toNumber(product.stock);
    const stockAfter = stockBefore + quantity;

    product.stock = stockAfter;
    product.cost = unitCost;
    await product.save();

    documents.push({
      barcode: product.barcode,
      categoryName: product.categoryName,
      direction: 'IN',
      note: purchase.note || '',
      productId: product._id,
      productName: product.name,
      quantity,
      referenceId: String(purchase._id),
      referenceType: 'PURCHASE',
      stockAfter,
      stockBefore,
      totalCost: unitCost * quantity,
      type: 'PURCHASE',
      unitCost,
      user: sanitizeUser(user),
    });
  }

  const transactions = await InventoryTransaction.insertMany(documents);
  return transactions.map(mapInventoryTransaction);
}

module.exports = { adjustStock, listTransactions, recordPurchaseTransactions, recordSaleTransactions };

