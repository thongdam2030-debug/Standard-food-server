const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { escapeRegex, normalizeOptionalString } = require('../utils/strings');

function createCreditBillNumber(date = new Date()) {
  const dateKey = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `Credit-${dateKey}-${suffix}`;
}

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeCreditItems(values) {
  const rawItems = Array.isArray(values.items) ? values.items : [];
  const items = rawItems
    .map((item) => ({
      amount: Math.max(toNumber(item.amount), 0),
      title: normalizeOptionalString(item.title),
    }))
    .filter((item) => item.title && item.amount > 0);

  if (items.length > 0) {
    return items;
  }

  return [{ amount: Math.max(toNumber(values.amount), 0), title: values.title.trim() }];
}

function buildSort(query) {
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
}

function getCustomerId(customer) {
  return String(customer._id || customer.id || '');
}

function getRemainingDebt(customer) {
  return (customer.creditBills || [])
    .filter((bill) => bill.status === 'UNPAID')
    .reduce((total, bill) => total + toNumber(bill.amount), 0);
}

function getActiveDepositSummary(customer) {
  return (customer.depositedItems || [])
    .filter((item) => item.status === 'ACTIVE')
    .reduce(
      (summary, item) => ({
        count: summary.count + 1,
        quantity: summary.quantity + toNumber(item.quantity),
      }),
      { count: 0, quantity: 0 },
    );
}

async function attachCustomerSummaries(customers) {
  if (!customers.length) return customers;

  const customerIds = customers.map(getCustomerId).filter(Boolean);
  const purchaseTotals = await Sale.aggregate([
    { $match: { 'customer.id': { $in: customerIds } } },
    {
      $group: {
        _id: '$customer.id',
        billCount: { $sum: 1 },
        totalPurchase: { $sum: '$summary.grandTotal' },
      },
    },
  ]);
  const purchasesByCustomerId = new Map(
    purchaseTotals.map((purchaseTotal) => [
      String(purchaseTotal._id),
      {
        billCount: toNumber(purchaseTotal.billCount),
        totalPurchase: toNumber(purchaseTotal.totalPurchase),
      },
    ]),
  );

  return customers.map((customer) => {
    const customerId = getCustomerId(customer);
    const purchaseSummary = purchasesByCustomerId.get(customerId) || { billCount: 0, totalPurchase: 0 };
    const activeDepositSummary = getActiveDepositSummary(customer);

    return {
      ...customer,
      summary: {
        activeDepositCount: activeDepositSummary.count,
        activeDepositQuantity: activeDepositSummary.quantity,
        billCount: purchaseSummary.billCount,
        remainingDebt: getRemainingDebt(customer),
        totalPurchase: purchaseSummary.totalPurchase,
      },
    };
  });
}

async function attachCustomerSummary(customer) {
  const [enrichedCustomer] = await attachCustomerSummaries([customer]);
  return enrichedCustomer;
}

async function ensureUniquePhone(phone, ignoreId) {
  const normalizedPhone = normalizeOptionalString(phone);

  if (!normalizedPhone) {
    return;
  }

  const existingCustomer = await Customer.findOne({ phone: normalizedPhone }).lean();

  if (existingCustomer && String(existingCustomer._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Customer phone already exists');
  }
}

async function listCustomers(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.q) {
    const regex = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
    filter.$or = [{ name: regex }, { phone: regex }];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort(buildSort(query)).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  const data = await attachCustomerSummaries(customers);

  return {
    data,
    pagination: createPagination(page, limit, total),
  };
}

async function getCustomerById(id) {
  const customer = await Customer.findById(id).lean();

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  return attachCustomerSummary(customer);
}

async function createCustomer(values) {
  const phone = normalizeOptionalString(values.phone);
  await ensureUniquePhone(phone);

  const customer = await Customer.create({
    name: values.name.trim(),
    phone,
    address: normalizeOptionalString(values.address),
  });

  return attachCustomerSummary(customer.toObject());
}

async function updateCustomer(id, values) {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  const phone = normalizeOptionalString(values.phone);
  await ensureUniquePhone(phone, id);

  customer.name = values.name.trim();
  customer.phone = phone;
  customer.address = normalizeOptionalString(values.address);

  await customer.save();
  return attachCustomerSummary(customer.toObject());
}


async function addCreditBill(id, values) {
  const customer = await Customer.findById(id);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const items = normalizeCreditItems(values);
  const amount = items.reduce((total, item) => total + item.amount, 0);

  customer.creditBills.push({
    amount,
    billNumber: values.billNumber ? normalizeOptionalString(values.billNumber) : createCreditBillNumber(),
    items,
    note: normalizeOptionalString(values.note),
    status: 'UNPAID',
    title: values.title?.trim() || items.map((item) => item.title).join(', '),
  });

  await customer.save();
  return attachCustomerSummary(customer.toObject());
}

async function markCreditBillPaid(id, billId) {
  const customer = await Customer.findById(id);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const bill = customer.creditBills.id(billId);
  if (!bill) throw new ApiError(404, 'Credit bill not found');

  bill.status = 'PAID';
  bill.paidAt = new Date();
  await customer.save();
  return attachCustomerSummary(customer.toObject());
}

async function addDepositedItem(id, values) {
  const customer = await Customer.findById(id);
  if (!customer) throw new ApiError(404, 'Customer not found');

  customer.depositedItems.push({
    itemName: values.itemName.trim(),
    note: normalizeOptionalString(values.note),
    quantity: Math.max(toNumber(values.quantity), 0),
    status: 'ACTIVE',
  });

  await customer.save();
  return attachCustomerSummary(customer.toObject());
}

async function markDepositedItemReturned(id, itemId) {
  const customer = await Customer.findById(id);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const item = customer.depositedItems.id(itemId);
  if (!item) throw new ApiError(404, 'Deposited item not found');

  item.status = 'RETURNED';
  item.returnedAt = new Date();
  await customer.save();
  return attachCustomerSummary(customer.toObject());
}
async function deleteCustomer(id) {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  await customer.deleteOne();
  return { deleted: true };
}

module.exports = {
  addCreditBill,
  addDepositedItem,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  markCreditBillPaid,
  markDepositedItemReturned,
  updateCustomer,
};

