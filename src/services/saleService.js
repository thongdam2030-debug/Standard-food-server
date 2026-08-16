const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const inventoryService = require('./inventoryService');
const productService = require('./productService');
const recipeService = require('./recipeService');
const shiftService = require('./shiftService');
const { emitRealtimeEvent } = require('../realtime/socket');
const { ApiError } = require('../utils/ApiError');

const paymentMethods = ['CASH', 'QR', 'BANK_TRANSFER', 'CARD', 'OTHER'];
const orderStatuses = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

function sanitizeUser(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

async function resolveCustomerSnapshot(customerId) {
  if (!customerId) {
    return null;
  }

  const customer = await Customer.findById(customerId).lean();

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  return {
    address: customer.address || '',
    id: String(customer._id),
    name: customer.name || '',
    phone: customer.phone || '',
  };
}

function roundCurrency(amount) {
  return Math.round(Number.isFinite(amount) ? amount : 0);
}

function normalizeRate(rate) {
  const numericRate = Number(rate);
  return Number.isFinite(numericRate) ? Math.min(Math.max(numericRate, 0), 100) : 0;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSaleItems(items = []) {
  return items
    .map((item) => ({
      ...item,
      price: Math.max(Number(item.price || 0), 0),
      quantity: Math.max(Number(item.quantity || 0), 0),
      specialInstructions: Array.isArray(item.specialInstructions) ? item.specialInstructions.map(normalizeText).filter(Boolean) : [],
    }))
    .filter((item) => item.productId && item.quantity > 0);
}

function calculateSummary(items, sourceSummary = {}) {
  const subtotal = roundCurrency(items.reduce((total, item) => total + item.price * item.quantity, 0));
  const discount = Math.min(Math.max(Number(sourceSummary.discount || 0), 0), subtotal);
  const serviceChargeRate = normalizeRate(sourceSummary.serviceChargeRate);
  const vatRate = normalizeRate(sourceSummary.vatRate);
  const taxableAmount = roundCurrency(subtotal - discount);
  const serviceChargeAmount = roundCurrency(taxableAmount * (serviceChargeRate / 100));
  const vatAmount = roundCurrency((taxableAmount + serviceChargeAmount) * (vatRate / 100));

  return {
    discount,
    grandTotal: taxableAmount + serviceChargeAmount + vatAmount,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    serviceChargeAmount,
    serviceChargeRate,
    subtotal,
    taxableAmount,
    vatAmount,
    vatRate,
  };
}

function normalizePayment(sourcePayment = {}, summary) {
  const method = paymentMethods.includes(sourcePayment.method) ? sourcePayment.method : 'CASH';
  const amount = roundCurrency(summary.grandTotal);
  const receivedAmount = method === 'CASH' ? roundCurrency(Number(sourcePayment.receivedAmount || amount)) : amount;

  if (method === 'CASH' && receivedAmount < amount) {
    throw new ApiError(400, 'Received cash is less than total amount');
  }

  return {
    amount,
    changeAmount: method === 'CASH' ? Math.max(receivedAmount - amount, 0) : 0,
    method,
    receivedAmount,
    reference: normalizeText(sourcePayment.reference),
    status: 'PAID',
  };
}

function createOrderNumber(date = new Date()) {
  const dateKey = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
  const timeKey = [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0'), String(date.getSeconds()).padStart(2, '0')].join('');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${dateKey}-${timeKey}-${suffix}`;
}

function mapOrder(order) {
  const plainOrder = typeof order.toObject === 'function' ? order.toObject() : order;
  return {
    id: String(plainOrder._id),
    orderNumber: plainOrder.orderNumber,
    tableNumber: plainOrder.tableNumber,
    orderType: plainOrder.orderType,
    status: plainOrder.status,
    paymentStatus: plainOrder.paymentStatus,
    items: plainOrder.items.map((item) => ({ ...item, productId: String(item.productId) })),
    summary: plainOrder.summary,
    employee: plainOrder.employee,
    customer: plainOrder.customer,
    note: plainOrder.note,
    createdAt: plainOrder.createdAt,
    updatedAt: plainOrder.updatedAt,
  };
}

function mapPayment(payment) {
  const plainPayment = typeof payment.toObject === 'function' ? payment.toObject() : payment;
  return {
    id: String(plainPayment._id),
    orderId: String(plainPayment.orderId),
    saleId: plainPayment.saleId ? String(plainPayment.saleId) : null,
    method: plainPayment.method,
    status: plainPayment.status,
    amount: plainPayment.amount,
    receivedAmount: plainPayment.receivedAmount,
    changeAmount: plainPayment.changeAmount,
    reference: plainPayment.reference,
    cashier: plainPayment.cashier,
    paidAt: plainPayment.paidAt,
    createdAt: plainPayment.createdAt,
    updatedAt: plainPayment.updatedAt,
  };
}

function mapSale(sale) {
  const plainSale = typeof sale.toObject === 'function' ? sale.toObject() : sale;
  return {
    id: String(plainSale._id),
    tableNumber: plainSale.tableNumber,
    items: plainSale.items.map((item) => ({ ...item, productId: String(item.productId) })),
    summary: plainSale.summary,
    cashier: plainSale.cashier,
    customer: plainSale.customer,
    order: plainSale.order,
    payment: plainSale.payment,
    createdAt: plainSale.createdAt,
    updatedAt: plainSale.updatedAt,
  };
}

async function listSales(user) {
  const filter = user.role === 'owner' ? {} : { 'cashier.id': String(user._id || user.id) };
  const sales = await Sale.find(filter).sort({ createdAt: -1 }).lean();
  return sales.map(mapSale);
}

async function createOrder(user, values) {
  const items = normalizeSaleItems(values.items);
  if (items.length === 0) {
    throw new ApiError(400, 'Order items are required');
  }

  const summary = calculateSummary(items, values.summary);
  const order = await Order.create({
    customer: await resolveCustomerSnapshot(values.customerId),
    employee: sanitizeUser(user),
    items,
    note: normalizeText(values.orderNote),
    orderNumber: createOrderNumber(),
    orderType: values.orderType || 'DINE_IN',
    paymentStatus: 'PENDING',
    status: 'NEW',
    summary,
    tableNumber: values.tableNumber,
  });

  const mappedOrder = mapOrder(order);
  emitRealtimeEvent('order:created', mappedOrder);
  return mappedOrder;
}

async function importSale(user, values) {
  const items = normalizeSaleItems(values.items);
  const cashier = values.cashier || sanitizeUser(user);
  const summary = calculateSummary(items, values.summary);
  const createdAt = values.createdAt ? new Date(values.createdAt) : new Date();
  const orderNumber = values.order?.orderNumber || createOrderNumber(createdAt);
  const order = await Order.create({
    createdAt,
    customer: values.customer || await resolveCustomerSnapshot(values.customerId),
    employee: cashier,
    items,
    orderNumber,
    orderType: values.order?.orderType || 'DINE_IN',
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    summary,
    tableNumber: values.tableNumber,
    updatedAt: createdAt,
  });
  const paymentValues = normalizePayment(values.payment, summary);
  const payment = await Payment.create({
    ...paymentValues,
    cashier,
    createdAt,
    orderId: order._id,
    paidAt: createdAt,
    updatedAt: createdAt,
  });
  const sale = await Sale.create({
    cashier,
    createdAt,
    customer: order.customer,
    items,
    order: {
      id: String(order._id),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      paymentStatus: order.paymentStatus,
      status: order.status,
    },
    payment: {
      id: String(payment._id),
      amount: payment.amount,
      changeAmount: payment.changeAmount,
      method: payment.method,
      paidAt: payment.paidAt,
      receivedAmount: payment.receivedAmount,
      reference: payment.reference,
      status: payment.status,
    },
    summary,
    tableNumber: values.tableNumber,
    updatedAt: createdAt,
  });
  payment.saleId = sale._id;
  await payment.save();
  return mapSale(sale);
}

async function closeSale(user, values) {
  const items = normalizeSaleItems(values.items);
  if (items.length === 0) {
    throw new ApiError(400, 'Sale items are required');
  }

  const cashier = sanitizeUser(user);
  const summary = calculateSummary(items, values.summary);
  const paymentValues = normalizePayment(values.payment, summary);
  const customer = await resolveCustomerSnapshot(values.customerId);

  const stockMovements = await productService.decreaseProductStock(items.map((item) => ({ productId: item.productId, quantity: item.quantity })));

  let order;
  if (values.orderId) {
    const filter = user.role === 'owner' ? { _id: values.orderId } : { _id: values.orderId, 'employee.id': String(user._id || user.id) };
    order = await Order.findOne(filter);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    order.customer = customer;
    order.items = items;
    order.summary = summary;
    order.paymentStatus = 'PAID';
    order.status = 'COMPLETED';
    await order.save();
  } else {
    order = await Order.create({
      customer,
      employee: cashier,
      items,
      note: normalizeText(values.orderNote),
      orderNumber: createOrderNumber(),
      orderType: values.orderType || 'DINE_IN',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      summary,
      tableNumber: values.tableNumber,
    });
  }

  const payment = await Payment.create({
    ...paymentValues,
    cashier,
    orderId: order._id,
  });

  const sale = await Sale.create({
    cashier,
    customer,
    items,
    order: {
      id: String(order._id),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      paymentStatus: order.paymentStatus,
      status: order.status,
    },
    payment: {
      id: String(payment._id),
      amount: payment.amount,
      changeAmount: payment.changeAmount,
      method: payment.method,
      paidAt: payment.paidAt,
      receivedAmount: payment.receivedAmount,
      reference: payment.reference,
      status: payment.status,
    },
    summary,
    tableNumber: values.tableNumber,
  });

  payment.saleId = sale._id;
  await payment.save();
  await inventoryService.recordSaleTransactions(cashier, stockMovements, sale._id);
  await recipeService.recordSaleConsumption(cashier, sale);

  const mappedOrder = mapOrder(order);
  emitRealtimeEvent('order:updated', mappedOrder);

  return mapSale(sale);
}

async function listOrders(user) {
  const filter = user.role === 'owner' ? {} : { 'employee.id': String(user._id || user.id) };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
  return orders.map(mapOrder);
}

async function updateOrderStatus(user, id, status) {
  if (!orderStatuses.includes(status)) {
    throw new ApiError(400, 'Order status is invalid');
  }

  const filter = user.role === 'owner' ? { _id: id } : { _id: id, 'employee.id': String(user._id || user.id) };
  const order = await Order.findOne(filter);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.status = status;
  if (status === 'COMPLETED') {
    order.paymentStatus = 'PAID';
  }

  await order.save();

  await Sale.updateOne(
    { 'order.id': String(order._id) },
    {
      $set: {
        'order.status': order.status,
        'order.paymentStatus': order.paymentStatus,
      },
    },
  );

  const mappedOrder = mapOrder(order);
  emitRealtimeEvent('order:updated', mappedOrder);
  return mappedOrder;
}

async function listPayments(user) {
  const filter = user.role === 'owner' ? {} : { 'cashier.id': String(user._id || user.id) };
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).lean();
  return payments.map(mapPayment);
}

module.exports = { closeSale, createOrder, importSale, listOrders, listPayments, listSales, updateOrderStatus };












