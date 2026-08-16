const Expense = require('../models/Expense');
const InventoryTransaction = require('../models/InventoryTransaction');
const Sale = require('../models/Sale');

function getDateRange(query = {}) {
  const now = new Date();
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = query.dateTo ? new Date(query.dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addToGroup(groups, key, amount) {
  groups[key] = (groups[key] || 0) + amount;
}

async function getProfitReport(query = {}) {
  const { dateFrom, dateTo } = getDateRange(query);
  const dateFilter = { $gte: dateFrom, $lte: dateTo };
  const [sales, cogsTransactions, expenses] = await Promise.all([
    Sale.find({ createdAt: dateFilter }).lean(),
    InventoryTransaction.find({ createdAt: dateFilter, referenceType: 'SALE', type: 'SALE' }).lean(),
    Expense.find({ expenseDate: dateFilter }).lean(),
  ]);

  const salesByDay = {};
  const expensesByCategory = {};
  const cogsByProduct = {};
  const productProfit = {};

  let revenue = 0;
  let discount = 0;
  let serviceCharge = 0;
  let vat = 0;
  let itemCount = 0;

  sales.forEach((sale) => {
    const saleRevenue = toNumber(sale.summary?.grandTotal);
    revenue += saleRevenue;
    discount += toNumber(sale.summary?.discount);
    serviceCharge += toNumber(sale.summary?.serviceChargeAmount);
    vat += toNumber(sale.summary?.vatAmount);
    itemCount += toNumber(sale.summary?.itemCount);
    addToGroup(salesByDay, getDateKey(sale.createdAt), saleRevenue);

    (sale.items || []).forEach((item) => {
      const key = String(item.productId || item.name);
      const current = productProfit[key] || { name: item.name, quantity: 0, revenue: 0, cogs: 0, grossProfit: 0 };
      current.quantity += toNumber(item.quantity);
      current.revenue += toNumber(item.price) * toNumber(item.quantity);
      current.grossProfit = current.revenue - current.cogs;
      productProfit[key] = current;
    });
  });

  const cogs = cogsTransactions.reduce((total, transaction) => {
    const cost = toNumber(transaction.totalCost);
    const key = String(transaction.productId || transaction.productName);
    addToGroup(cogsByProduct, transaction.productName || key, cost);

    if (productProfit[key]) {
      productProfit[key].cogs += cost;
      productProfit[key].grossProfit = productProfit[key].revenue - productProfit[key].cogs;
    }

    return total + cost;
  }, 0);

  const totalExpenses = expenses.reduce((total, expense) => {
    addToGroup(expensesByCategory, expense.category, toNumber(expense.amount));
    return total + toNumber(expense.amount);
  }, 0);

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    summary: {
      billCount: sales.length,
      cogs,
      discount,
      grossMargin,
      grossProfit,
      itemCount,
      netMargin,
      netProfit,
      revenue,
      serviceCharge,
      totalExpenses,
      vat,
    },
    cogsByProduct,
    expensesByCategory,
    productProfit: Object.values(productProfit).sort((firstProduct, secondProduct) => secondProduct.grossProfit - firstProduct.grossProfit),
    salesByDay,
  };
}

module.exports = { getProfitReport };
