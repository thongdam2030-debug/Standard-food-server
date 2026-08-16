const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const inventoryService = require('./inventoryService');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { normalizeOptionalString } = require('../utils/strings');

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

function getPurchaseNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PO-${datePart}-${randomPart}`;
}

function mapPurchase(purchase) {
  const plainPurchase = typeof purchase.toObject === 'function' ? purchase.toObject() : purchase;
  return {
    ...plainPurchase,
    id: String(plainPurchase._id),
    supplierId: String(plainPurchase.supplierId),
    items: (plainPurchase.items || []).map((item) => ({
      ...item,
      productId: String(item.productId),
    })),
  };
}

function buildFilter(query = {}) {
  const filter = {};
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.paymentStatus && query.paymentStatus !== 'all') filter.paymentStatus = query.paymentStatus;
  if (query.dateFrom || query.dateTo) {
    filter.purchaseDate = {};
    if (query.dateFrom) filter.purchaseDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filter.purchaseDate.$lte = dateTo;
    }
  }
  return filter;
}

async function resolveItems(items = []) {
  const resolvedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId).lean();
    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }

    const quantity = Math.max(toNumber(item.quantity), 0);
    const unitCost = Math.max(toNumber(item.unitCost), 0);

    if (quantity <= 0) {
      throw new ApiError(400, 'Purchase item quantity must be greater than 0');
    }

    resolvedItems.push({
      productId: product._id,
      productName: product.name,
      quantity,
      receivedQuantity: 0,
      totalCost: quantity * unitCost,
      unitCost,
    });
  }

  if (!resolvedItems.length) {
    throw new ApiError(400, 'Purchase must have at least one item');
  }

  return resolvedItems;
}

function calculateTotals(items, discountValue) {
  const subtotal = items.reduce((total, item) => total + toNumber(item.totalCost), 0);
  const discount = Math.max(toNumber(discountValue), 0);
  return { subtotal, discount, grandTotal: Math.max(subtotal - discount, 0) };
}

async function listPurchases(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(query);

  const [purchases, total] = await Promise.all([
    Purchase.find(filter).sort({ purchaseDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Purchase.countDocuments(filter),
  ]);

  return {
    data: purchases.map(mapPurchase),
    pagination: createPagination(page, limit, total),
  };
}

async function getPurchaseById(id) {
  const purchase = await Purchase.findById(id).lean();
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  return mapPurchase(purchase);
}

async function createPurchase(user, values) {
  const supplier = await Supplier.findById(values.supplierId).lean();
  if (!supplier || !supplier.isActive) throw new ApiError(404, 'Active supplier not found');

  const items = await resolveItems(values.items);
  const totals = calculateTotals(items, values.discount);
  const paidAmount = Math.max(toNumber(values.paidAmount), 0);
  const paymentStatus = paidAmount >= totals.grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : (values.paymentStatus || 'UNPAID');

  const purchase = await Purchase.create({
    discount: totals.discount,
    grandTotal: totals.grandTotal,
    items,
    note: normalizeOptionalString(values.note),
    paidAmount,
    paymentStatus,
    purchaseDate: values.purchaseDate ? new Date(values.purchaseDate) : new Date(),
    purchaseNumber: getPurchaseNumber(),
    status: values.status || 'ORDERED',
    subtotal: totals.subtotal,
    supplier: {
      contactPerson: supplier.contactPerson || '',
      id: String(supplier._id),
      name: supplier.name,
      phone: supplier.phone || '',
    },
    supplierId: supplier._id,
    user: sanitizeUser(user),
  });

  return mapPurchase(purchase);
}

async function receivePurchase(user, id) {
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  if (purchase.status === 'RECEIVED') throw new ApiError(409, 'Purchase already received');
  if (purchase.status === 'CANCELLED') throw new ApiError(409, 'Cancelled purchase cannot be received');

  const transactions = await inventoryService.recordPurchaseTransactions(user, purchase, purchase.items);
  purchase.items.forEach((item) => {
    item.receivedQuantity = item.quantity;
  });
  purchase.status = 'RECEIVED';
  purchase.receivedAt = new Date();
  await purchase.save();

  return { purchase: mapPurchase(purchase), transactions };
}

async function updatePaymentStatus(id, values) {
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new ApiError(404, 'Purchase not found');

  const paidAmount = Math.max(toNumber(values.paidAmount), 0);
  purchase.paidAmount = paidAmount;
  purchase.paymentStatus = paidAmount >= purchase.grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
  await purchase.save();
  return mapPurchase(purchase);
}

async function cancelPurchase(id) {
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  if (purchase.status === 'RECEIVED') throw new ApiError(409, 'Received purchase cannot be cancelled');

  purchase.status = 'CANCELLED';
  await purchase.save();
  return mapPurchase(purchase);
}

module.exports = {
  cancelPurchase,
  createPurchase,
  getPurchaseById,
  listPurchases,
  receivePurchase,
  updatePaymentStatus,
};
