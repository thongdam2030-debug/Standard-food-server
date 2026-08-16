const Cart = require('../models/Cart');
const Product = require('../models/Product');
const tableService = require('./tableService');
const { ApiError } = require('../utils/ApiError');

function isValidTableNumber(tableNumber) {
  return Number.isInteger(Number(tableNumber)) && Number(tableNumber) >= 1;
}

function clampRate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 100) : 0;
}

function createCartItemId(item) {
  const instructionsKey = (item.specialInstructions || []).map((instruction) => String(instruction).trim()).filter(Boolean).join('|');
  return [String(item.productId), item.size || 'regular', instructionsKey].join('::');
}

function emptyTableCart() {
  return { discount: 0, items: [], serviceChargeRate: 0, status: 'available', vatRate: 0, updatedAt: new Date() };
}

function normalizeTableCart(cart) {
  if (!cart) return emptyTableCart();
  const plainCart = typeof cart.toObject === 'function' ? cart.toObject() : cart;
  const items = Array.isArray(plainCart.items) ? plainCart.items.filter((item) => Number(item.quantity) > 0) : [];
  const status = items.length > 0 ? 'occupied' : plainCart.status || 'available';

  return {
    discount: Number.isFinite(Number(plainCart.discount)) ? Math.max(Number(plainCart.discount), 0) : 0,
    items,
    serviceChargeRate: clampRate(plainCart.serviceChargeRate),
    openedAt: plainCart.openedAt,
    reservationName: plainCart.reservationName || '',
    status,
    updatedAt: plainCart.updatedAt || new Date(),
    vatRate: clampRate(plainCart.vatRate),
  };
}

function getTable(cart, tableNumber) {
  return normalizeTableCart(cart.tables?.get(String(tableNumber)));
}

function setTable(cart, tableNumber, tableCart) {
  cart.tables.set(String(tableNumber), { ...normalizeTableCart(tableCart), updatedAt: new Date() });
}

function deleteTable(cart, tableNumber) {
  cart.tables.delete(String(tableNumber));
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, selectedTableNumber: null, tables: {} });
  return cart;
}

async function findProducts(items) {
  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  return new Map(products.map((product) => [String(product._id), product]));
}

function describeItem(item, product) {
  const size = item.size === 'small' ? 'ນ້ອຍ' : item.size === 'large' ? 'ໃຫຍ່' : 'ປົກກະຕິ';
  const instructions = item.specialInstructions?.length ? ` (${item.specialInstructions.join(', ')})` : '';
  return `${product.name} ${size}${instructions} x${item.quantity}`;
}

async function mapItems(items) {
  const productMap = await findProducts(items);
  return items.map((item) => {
    const product = productMap.get(String(item.productId));
    if (!product) return null;
    const specialInstructions = Array.isArray(item.specialInstructions) ? item.specialInstructions : [];
    const size = ['small', 'regular', 'large'].includes(item.size) ? item.size : 'regular';
    return {
      cartItemId: createCartItemId({ ...item, size, specialInstructions }),
      productId: String(product._id),
      barcode: product.barcode || '',
      category: product.categoryName || '',
      image: product.image || '',
      name: product.name,
      price: product.price,
      quantity: Math.min(Number(item.quantity) || 0, product.stock),
      size,
      specialInstructions,
      stock: product.stock,
    };
  }).filter(Boolean).filter((item) => item.quantity > 0);
}

async function toServerCart(cart) {
  const activeTableNumbers = await tableService.getActiveTableNumbers();
  const selectedTableNumber = isValidTableNumber(cart.selectedTableNumber) && activeTableNumbers.has(Number(cart.selectedTableNumber))
    ? Number(cart.selectedTableNumber)
    : null;
  const selectedCart = selectedTableNumber ? getTable(cart, selectedTableNumber) : emptyTableCart();
  const selectedItems = await mapItems(selectedCart.items);
  const tableSummaries = [];

  for (const [tableKey, tableCart] of cart.tables.entries()) {
    const tableNumber = Number(tableKey);
    if (!isValidTableNumber(tableNumber) || !activeTableNumbers.has(tableNumber)) continue;
    const normalizedCart = normalizeTableCart(tableCart);
    const mappedItems = await mapItems(normalizedCart.items);
    const status = mappedItems.length > 0 ? 'occupied' : normalizedCart.status;
    if (status === 'available') continue;
    const productMap = await findProducts(normalizedCart.items);
    tableSummaries.push({
      itemCount: mappedItems.reduce((total, item) => total + item.quantity, 0),
      itemNames: normalizedCart.items.map((item) => {
        const product = productMap.get(String(item.productId));
        return product ? describeItem(item, product) : '';
      }).filter(Boolean),
      openedAt: normalizedCart.openedAt,
      reservationName: normalizedCart.reservationName,
      status,
      tableNumber,
    });
  }

  return {
    discount: selectedCart.discount,
    items: selectedItems,
    serviceChargeRate: selectedCart.serviceChargeRate,
    tableNumber: selectedTableNumber,
    tableSummaries: tableSummaries.sort((a, b) => a.tableNumber - b.tableNumber),
    updatedAt: cart.updatedAt,
    vatRate: selectedCart.vatRate,
  };
}

async function getSelectedTable(cart) {
  const tableNumber = await tableService.ensureValidTableNumber(cart.selectedTableNumber);
  return getTable(cart, tableNumber);
}

async function getCart(userId) {
  return toServerCart(await getOrCreateCart(userId));
}

async function setCartTableNumber(userId, tableNumber) {
  const cart = await getOrCreateCart(userId);
  cart.selectedTableNumber = tableNumber ? await tableService.ensureValidTableNumber(tableNumber) : null;
  await cart.save();
  return toServerCart(cart);
}

async function openTable(userId, tableNumber) {
  const validTableNumber = await tableService.ensureValidTableNumber(tableNumber);
  const cart = await getOrCreateCart(userId);
  const tableCart = getTable(cart, validTableNumber);
  setTable(cart, validTableNumber, { ...tableCart, openedAt: tableCart.openedAt || new Date(), reservationName: '', status: 'occupied' });
  cart.selectedTableNumber = validTableNumber;
  await cart.save();
  return toServerCart(cart);
}

async function reserveTable(userId, tableNumber, reservationName) {
  const validTableNumber = await tableService.ensureValidTableNumber(tableNumber);
  const cart = await getOrCreateCart(userId);
  const tableCart = getTable(cart, validTableNumber);
  if (tableCart.items.length > 0 || tableCart.status === 'occupied') throw new ApiError(400, 'Table is occupied');
  setTable(cart, validTableNumber, { ...tableCart, reservationName: String(reservationName || '').trim(), status: 'reserved' });
  cart.selectedTableNumber = validTableNumber;
  await cart.save();
  return toServerCart(cart);
}

async function cancelTableReservation(userId, tableNumber) {
  const validTableNumber = await tableService.ensureValidTableNumber(tableNumber);
  const cart = await getOrCreateCart(userId);
  deleteTable(cart, validTableNumber);
  cart.selectedTableNumber = validTableNumber;
  await cart.save();
  return toServerCart(cart);
}

async function cancelOpenTable(userId, tableNumber) {
  const validTableNumber = await tableService.ensureValidTableNumber(tableNumber);
  const cart = await getOrCreateCart(userId);
  deleteTable(cart, validTableNumber);
  cart.selectedTableNumber = validTableNumber;
  await cart.save();
  return toServerCart(cart);
}

function findStoredItem(items, cartItemId) {
  return items.find((item) => createCartItemId(item) === cartItemId || String(item.productId) === cartItemId);
}

async function addCartItem(userId, productId, quantity = 1, options = {}) {
  const product = await Product.findOne({ _id: productId, isActive: true }).lean();
  if (!product) throw new ApiError(404, 'Product not found');
  const cart = await getOrCreateCart(userId);
  const tableCart = await getSelectedTable(cart);
  const size = ['small', 'regular', 'large'].includes(options.size) ? options.size : 'regular';
  const specialInstructions = Array.isArray(options.specialInstructions) ? options.specialInstructions.map(String).filter(Boolean) : [];
  const nextItem = { productId, quantity: 0, size, specialInstructions };
  const cartItemId = createCartItemId(nextItem);
  const existingItem = findStoredItem(tableCart.items, cartItemId);
  const otherQuantity = tableCart.items.reduce((total, item) => String(item.productId) === String(productId) && createCartItemId(item) !== cartItemId ? total + Number(item.quantity || 0) : total, 0);
  const availableQuantity = Math.max(product.stock - otherQuantity, 0);

  if (existingItem) existingItem.quantity = Math.min(Number(existingItem.quantity || 0) + Number(quantity || 1), availableQuantity);
  else tableCart.items.unshift({ ...nextItem, quantity: Math.min(Number(quantity || 1), availableQuantity) });

  setTable(cart, cart.selectedTableNumber, { ...tableCart, openedAt: tableCart.openedAt || new Date(), reservationName: '', status: 'occupied' });
  await cart.save();
  return toServerCart(cart);
}

async function setCartItemQuantity(userId, cartItemId, quantity) {
  const cart = await getOrCreateCart(userId);
  const tableCart = await getSelectedTable(cart);
  const item = findStoredItem(tableCart.items, cartItemId);
  if (!item) return toServerCart(cart);
  item.quantity = Number(quantity || 0);
  tableCart.items = tableCart.items.filter((nextItem) => Number(nextItem.quantity) > 0);
  setTable(cart, cart.selectedTableNumber, tableCart);
  await cart.save();
  return toServerCart(cart);
}

async function removeCartItem(userId, cartItemId) {
  const cart = await getOrCreateCart(userId);
  const tableCart = await getSelectedTable(cart);
  tableCart.items = tableCart.items.filter((item) => createCartItemId(item) !== cartItemId && String(item.productId) !== cartItemId);
  setTable(cart, cart.selectedTableNumber, tableCart);
  await cart.save();
  return toServerCart(cart);
}

async function setCartDiscount(userId, discount) {
  const cart = await getOrCreateCart(userId);
  const tableCart = await getSelectedTable(cart);
  setTable(cart, cart.selectedTableNumber, { ...tableCart, discount: Math.max(Number(discount) || 0, 0) });
  await cart.save();
  return toServerCart(cart);
}

async function setCartServiceChargeRate(userId, serviceChargeRate) {
  const cart = await getOrCreateCart(userId);
  const tableCart = await getSelectedTable(cart);
  setTable(cart, cart.selectedTableNumber, { ...tableCart, serviceChargeRate: clampRate(serviceChargeRate) });
  await cart.save();
  return toServerCart(cart);
}

async function setCartVatRate(userId, vatRate) {
  const cart = await getOrCreateCart(userId);
  const tableCart = await getSelectedTable(cart);
  setTable(cart, cart.selectedTableNumber, { ...tableCart, vatRate: clampRate(vatRate) });
  await cart.save();
  return toServerCart(cart);
}

async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  if (isValidTableNumber(cart.selectedTableNumber)) deleteTable(cart, Number(cart.selectedTableNumber));
  await cart.save();
  return toServerCart(cart);
}

async function moveTable(userId, sourceTableNumber, targetTableNumber) {
  const validSourceTableNumber = await tableService.ensureValidTableNumber(sourceTableNumber);
  const validTargetTableNumber = await tableService.ensureValidTableNumber(targetTableNumber);
  const cart = await getOrCreateCart(userId);
  const source = getTable(cart, validSourceTableNumber);
  deleteTable(cart, validSourceTableNumber);
  setTable(cart, validTargetTableNumber, source);
  cart.selectedTableNumber = validTargetTableNumber;
  await cart.save();
  return toServerCart(cart);
}

async function mergeTables(userId, sourceTableNumber, targetTableNumber) {
  const validSourceTableNumber = await tableService.ensureValidTableNumber(sourceTableNumber);
  const validTargetTableNumber = await tableService.ensureValidTableNumber(targetTableNumber);
  const cart = await getOrCreateCart(userId);
  const source = getTable(cart, validSourceTableNumber);
  const target = getTable(cart, validTargetTableNumber);
  deleteTable(cart, validSourceTableNumber);
  setTable(cart, validTargetTableNumber, { ...target, discount: target.discount + source.discount, items: [...target.items, ...source.items], status: 'occupied' });
  cart.selectedTableNumber = validTargetTableNumber;
  await cart.save();
  return toServerCart(cart);
}

module.exports = {
  addCartItem,
  cancelOpenTable,
  cancelTableReservation,
  clearCart,
  getCart,
  mergeTables,
  moveTable,
  openTable,
  removeCartItem,
  reserveTable,
  setCartDiscount,
  setCartItemQuantity,
  setCartServiceChargeRate,
  setCartTableNumber,
  setCartVatRate,
};

