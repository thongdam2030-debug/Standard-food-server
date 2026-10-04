const Cart = require('../models/Cart');
const Expense = require('../models/Expense');
const IngredientTransaction = require('../models/IngredientTransaction');
const InventoryTransaction = require('../models/InventoryTransaction');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Table = require('../models/Table');
const { ApiError } = require('../utils/ApiError');

const DASHBOARD_CACHE_TTL_MS = 30 * 1000;
const OTHER_TIME_SLOT_LABEL = '\u0EAD\u0EB7\u0EC8\u0E99\u0EC6';
const dashboardCache = new Map();

function getDateRange(query = {}) {
  const now = new Date();
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = query.dateTo ? new Date(query.dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

function getDayRange(value = new Date()) {
  const date = new Date(value);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getPreviousDayRange(value = new Date()) {
  const date = new Date(value);
  date.setDate(date.getDate() - 1);
  return getDayRange(date);
}

function getWeekRange(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(value = new Date()) {
  const date = new Date(value);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getReportDateRange(query = {}) {
  const mode = query.range || query.period || 'today';

  if (mode === 'week') return { ...getWeekRange(), mode: 'week' };
  if (mode === 'month') return { ...getMonthRange(), mode: 'month' };
  if (mode === 'custom') {
    const start = query.dateFrom ? new Date(query.dateFrom) : getDayRange().start;
    const end = query.dateTo ? new Date(query.dateTo) : getDayRange().end;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end, mode: 'custom' };
  }

  return { ...getDayRange(), mode: 'today' };
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

function getPercentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getTimeSlot(dateValue) {
  const hour = new Date(dateValue).getHours();
  if (hour >= 8 && hour < 10) return '08:00-10:00';
  if (hour >= 11 && hour < 14) return '11:00-14:00';
  if (hour >= 17 && hour < 20) return '17:00-20:00';
  return OTHER_TIME_SLOT_LABEL;
}

function createEmptyPaymentMethods() {
  return {
    BANK_TRANSFER: { method: 'BANK_TRANSFER', orderCount: 0, total: 0 },
    CARD: { method: 'CARD', orderCount: 0, total: 0 },
    CASH: { method: 'CASH', orderCount: 0, total: 0 },
    CREDIT: { method: 'CREDIT', orderCount: 0, total: 0 },
    OTHER: { method: 'OTHER', orderCount: 0, total: 0 },
    QR: { method: 'QR', orderCount: 0, total: 0 },
  };
}

function createEmptyTimeSlots() {
  return {
    '08:00-10:00': { label: '08:00-10:00', orderCount: 0, total: 0 },
    '11:00-14:00': { label: '11:00-14:00', orderCount: 0, total: 0 },
    '17:00-20:00': { label: '17:00-20:00', orderCount: 0, total: 0 },
    [OTHER_TIME_SLOT_LABEL]: { label: OTHER_TIME_SLOT_LABEL, orderCount: 0, total: 0 },
  };
}

function getCartTableEntries(tables) {
  if (!tables) return [];
  if (tables instanceof Map) return Array.from(tables.entries());
  if (typeof tables === 'object') return Object.entries(tables);
  return [];
}

function getTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getTableOpenedTimestamp(tableCart) {
  return getTimestamp(tableCart?.openedAt) || getTimestamp(tableCart?.updatedAt);
}

function getClosedTableTimes(sales) {
  const closedTableTimes = new Map();

  sales.forEach((sale) => {
    const tableNumber = Number(sale.tableNumber);
    if (!Number.isInteger(tableNumber)) return;
    if (sale.order?.orderType && sale.order.orderType !== 'DINE_IN') return;
    if (sale.payment?.status !== 'PAID') return;

    const closedAt = Math.max(getTimestamp(sale.payment?.paidAt), getTimestamp(sale.updatedAt), getTimestamp(sale.createdAt));
    if (closedAt > (closedTableTimes.get(tableNumber) || 0)) {
      closedTableTimes.set(tableNumber, closedAt);
    }
  });

  return closedTableTimes;
}

function getTableStatusFromCarts(carts, activeTables, pendingPaymentTables = new Set(), closedTableTimes = new Map()) {
  const activeTableNumbers = new Set(activeTables.map((table) => Number(table.number)));
  const tableStatusByNumber = new Map();

  carts.forEach((cart) => {
    getCartTableEntries(cart.tables).forEach(([tableKey, tableCart]) => {
      const tableNumber = Number(tableKey);
      if (!Number.isInteger(tableNumber) || !activeTableNumbers.has(tableNumber)) return;

      const items = Array.isArray(tableCart?.items) ? tableCart.items.filter((item) => toNumber(item.quantity) > 0) : [];
      const nextStatus = items.length > 0 ? 'occupied' : tableCart?.status || 'available';
      const closedAt = closedTableTimes.get(tableNumber) || 0;
      const tableOpenedAt = getTableOpenedTimestamp(tableCart);
      if (nextStatus !== 'reserved' && closedAt > 0 && tableOpenedAt <= closedAt) return;
      if (nextStatus === 'available') return;

      const currentStatus = tableStatusByNumber.get(tableNumber);
      if (currentStatus === 'occupied') return;
      if (nextStatus === 'occupied' || currentStatus !== 'reserved') {
        tableStatusByNumber.set(tableNumber, nextStatus);
      }
    });
  });

  let occupied = 0;
  let reserved = 0;
  tableStatusByNumber.forEach((status) => {
    if (status === 'occupied') occupied += 1;
    if (status === 'reserved') reserved += 1;
  });

  const pendingTableNumbers = new Set(
    Array.from(pendingPaymentTables)
      .map(Number)
      .filter((tableNumber) => activeTableNumbers.has(tableNumber))
      .filter((tableNumber) => tableStatusByNumber.has(tableNumber)),
  );
  const pendingPayment = pendingTableNumbers.size;
  const occupiedPendingCount = Array.from(pendingTableNumbers).filter((tableNumber) => tableStatusByNumber.get(tableNumber) === 'occupied').length;
  const reservedPendingCount = Array.from(pendingTableNumbers).filter((tableNumber) => tableStatusByNumber.get(tableNumber) === 'reserved').length;
  const occupiedCount = Math.max(occupied - occupiedPendingCount, 0);
  const reservedCount = Math.max(reserved - reservedPendingCount, 0);

  return {
    available: Math.max(activeTables.length - occupiedCount - reservedCount - pendingPayment, 0),
    occupied: occupiedCount,
    pendingPayment,
    reserved: reservedCount,
    total: activeTables.length,
  };
}

function getOrderId(value) {
  return value ? String(value) : '';
}

function buildDashboardOrders(orders, sales) {
  const orderById = new Map();

  orders.forEach((order) => {
    const id = getOrderId(order._id);
    if (!id) return;
    orderById.set(id, {
      id,
      orderNumber: order.orderNumber || '',
      orderType: order.orderType || 'DINE_IN',
      paymentStatus: order.paymentStatus || 'PENDING',
      status: order.status || 'NEW',
      tableNumber: Number(order.tableNumber),
    });
  });

  sales.forEach((sale) => {
    const saleOrder = sale.order || {};
    const id = getOrderId(saleOrder.id) || 'sale:' + (getOrderId(sale._id) || sale.orderNumber || sale.createdAt);
    const existingOrder = orderById.get(id);
    const paymentStatus = sale.payment?.status || saleOrder.paymentStatus || existingOrder?.paymentStatus || 'PAID';
    const status = saleOrder.status || existingOrder?.status || 'COMPLETED';

    orderById.set(id, {
      id,
      orderNumber: saleOrder.orderNumber || existingOrder?.orderNumber || '',
      orderType: saleOrder.orderType || existingOrder?.orderType || 'DINE_IN',
      paymentStatus,
      status,
      tableNumber: Number(sale.tableNumber || existingOrder?.tableNumber),
    });
  });

  return Array.from(orderById.values());
}

function getDashboardCacheKey(date = new Date()) {
  return getDateKey(date);
}

function getCachedDashboard(key) {
  const cachedValue = dashboardCache.get(key);
  if (!cachedValue) return null;

  if (Date.now() - cachedValue.cachedAt > DASHBOARD_CACHE_TTL_MS) {
    dashboardCache.delete(key);
    return null;
  }

  return {
    ...cachedValue.data,
    cache: {
      hit: true,
      cachedAt: new Date(cachedValue.cachedAt).toISOString(),
      ttlSeconds: Math.ceil((DASHBOARD_CACHE_TTL_MS - (Date.now() - cachedValue.cachedAt)) / 1000),
    },
  };
}

async function getDashboardTodayReport() {
  const cacheKey = getDashboardCacheKey();
  const cachedDashboard = getCachedDashboard(cacheKey);
  if (cachedDashboard) return cachedDashboard;

  const todayRange = getDayRange();
  const yesterdayRange = getPreviousDayRange();
  const todayFilter = { $gte: todayRange.start, $lte: todayRange.end };
  const yesterdayFilter = { $gte: yesterdayRange.start, $lte: yesterdayRange.end };

  const [todaySales, yesterdaySales, todayOrders, activeTables, activeProducts, carts, cogsTransactions, ingredientCogsTransactions] = await Promise.all([
    Sale.find({ createdAt: todayFilter }).lean(),
    Sale.find({ createdAt: yesterdayFilter }).lean(),
    Order.find({ createdAt: todayFilter }).lean(),
    Table.find({ isActive: true }).lean(),
    Product.find({ isActive: true }).lean(),
    Cart.find({}).lean(),
    InventoryTransaction.find({ createdAt: todayFilter, referenceType: 'SALE', type: 'SALE' }).lean(),
    IngredientTransaction.find({ createdAt: todayFilter, referenceType: 'SALE', type: 'SALE' }).lean(),
  ]);

  const productCostById = new Map(activeProducts.map((product) => [String(product._id), toNumber(product.cost)]));
  const productStockAlerts = activeProducts
    .filter((product) => toNumber(product.stock) <= 5)
    .sort((firstProduct, secondProduct) => toNumber(firstProduct.stock) - toNumber(secondProduct.stock))
    .slice(0, 8)
    .map((product) => ({
      id: String(product._id),
      category: product.categoryName || '',
      name: product.name,
      stock: toNumber(product.stock),
    }));

  const menuSales = new Map();
  const paymentMethods = createEmptyPaymentMethods();
  const timeSlots = createEmptyTimeSlots();
  let revenue = 0;
  let cost = 0;
  let soldItemCount = 0;

  todaySales.forEach((sale) => {
    const saleTotal = toNumber(sale.summary?.grandTotal);
    revenue += saleTotal;
    soldItemCount += toNumber(sale.summary?.itemCount) || (sale.items || []).reduce((total, item) => total + toNumber(item.quantity), 0);

    const paymentMethod = sale.payment?.method || 'OTHER';
    const paymentRow = paymentMethods[paymentMethod] || paymentMethods.OTHER;
    paymentRow.total += saleTotal;
    paymentRow.orderCount += 1;

    const slot = timeSlots[getTimeSlot(sale.createdAt)] || timeSlots[OTHER_TIME_SLOT_LABEL];
    slot.total += saleTotal;
    slot.orderCount += 1;

    (sale.items || []).forEach((item) => {
      const productId = String(item.productId || item.name);
      const quantity = toNumber(item.quantity);
      const itemRevenue = toNumber(item.price) * quantity;
      const itemCost = toNumber(productCostById.get(productId)) * quantity;
      cost += itemCost;

      const current = menuSales.get(productId) || {
        id: productId,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += quantity;
      current.revenue += itemRevenue;
      menuSales.set(productId, current);
    });
  });

  const cogsCost = cogsTransactions.reduce((total, transaction) => total + toNumber(transaction.totalCost), 0);
  const ingredientCogsCost = ingredientCogsTransactions.reduce((total, transaction) => total + toNumber(transaction.totalCost), 0);
  if (cogsCost + ingredientCogsCost > 0) cost = cogsCost + ingredientCogsCost;

  const yesterdayRevenue = yesterdaySales.reduce((total, sale) => total + toNumber(sale.summary?.grandTotal), 0);
  const completedStatuses = new Set(['SERVED', 'COMPLETED']);
  const inProgressStatuses = new Set(['NEW', 'CONFIRMED', 'PREPARING', 'READY']);
  const activeOrderStatuses = new Set(['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED']);

  const dashboardOrders = buildDashboardOrders(todayOrders, todaySales);
  const orderStatus = dashboardOrders.reduce(
    (summary, order) => {
      summary.total += 1;
      if (completedStatuses.has(order.status)) summary.completed += 1;
      if (inProgressStatuses.has(order.status)) summary.inProgress += 1;
      if (order.status === 'CANCELLED') summary.cancelled += 1;
      return summary;
    },
    { cancelled: 0, completed: 0, inProgress: 0, total: 0 },
  );

  const pendingPaymentTables = new Set();
  dashboardOrders.forEach((order) => {
    if (order.orderType !== 'DINE_IN' || !activeOrderStatuses.has(order.status)) return;
    if (order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL') {
      pendingPaymentTables.add(order.tableNumber);
    }
  });
  const closedTableTimes = getClosedTableTimes(todaySales);
  const tableStatus = getTableStatusFromCarts(carts, activeTables, pendingPaymentTables, closedTableTimes);

  const allMenuRows = Array.from(menuSales.values()).sort((firstMenu, secondMenu) => secondMenu.quantity - firstMenu.quantity);
  const topMenus = allMenuRows.slice(0, 5);
  const lowMenus = [...allMenuRows]
    .sort((firstMenu, secondMenu) => firstMenu.quantity - secondMenu.quantity || firstMenu.revenue - secondMenu.revenue)
    .slice(0, 5);
  const averageOrderValue = todaySales.length > 0 ? revenue / todaySales.length : 0;
  const profit = revenue - cost;

  const data = {
    date: getDateKey(todayRange.start),
    generatedAt: new Date().toISOString(),
    cache: {
      hit: false,
      cachedAt: new Date().toISOString(),
      ttlSeconds: DASHBOARD_CACHE_TTL_MS / 1000,
    },
    sales: {
      averageOrderValue,
      itemCount: soldItemCount,
      orderCount: todaySales.length,
      todayRevenue: revenue,
      yesterdayChangePercent: getPercentChange(revenue, yesterdayRevenue),
      yesterdayRevenue,
    },
    orders: orderStatus,
    menus: {
      low: lowMenus,
      top: topMenus,
    },
    timeSlots: Object.values(timeSlots),
    paymentMethods: Object.values(paymentMethods),
    tables: tableStatus,
    stockAlerts: productStockAlerts,
    profit: {
      cost,
      profit,
      revenue,
    },
  };

  dashboardCache.set(cacheKey, { cachedAt: Date.now(), data });
  return data;
}

function getSaleInvoiceNumber(sale) {
  return sale.order?.orderNumber || `INV-${String(sale._id).slice(-6).toUpperCase()}`;
}

function getSaleStatus(sale) {
  if (sale.order?.status === 'CANCELLED' || sale.payment?.status === 'REFUNDED') return 'CANCELLED';
  return 'COMPLETED';
}

function getSaleStaff(sale) {
  const cashier = sale.cashier || sale.employee || sale.payment?.cashier || sale.order?.employee || {};
  return {
    id: cashier.id || 'unknown',
    name: cashier.name || (cashier.role === 'owner' ? 'ເຈົ້າຂອງຮ້ານ' : 'ບໍ່ລະບຸຜູ້ຂາຍ'),
    role: cashier.role || '',
    username: cashier.username || '',
  };
}

function createStaffSaleFilter(staffId, range) {
  const id = String(staffId);
  return {
    createdAt: { $gte: range.start, $lte: range.end },
    $or: [
      { 'cashier.id': id },
      { 'employee.id': id },
      { 'payment.cashier.id': id },
      { 'order.employee.id': id },
    ],
  };
}

function getSaleItemCount(sale) {
  return toNumber(sale.summary?.itemCount) || (sale.items || []).reduce((total, item) => total + toNumber(item.quantity), 0);
}

function createSalesReportSummary() {
  return { averagePerBill: 0, billCount: 0, itemCount: 0, totalSales: 0 };
}

function addSaleToReportSummary(summary, sale) {
  summary.billCount += 1;
  summary.itemCount += getSaleItemCount(sale);
  summary.totalSales += toNumber(sale.summary?.grandTotal);
  summary.averagePerBill = summary.billCount > 0 ? summary.totalSales / summary.billCount : 0;
  return summary;
}

function mapInvoiceRow(sale) {
  const createdAt = new Date(sale.createdAt);
  return {
    id: String(sale._id),
    invoiceNumber: getSaleInvoiceNumber(sale),
    date: getDateKey(createdAt),
    time: createdAt.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }),
    itemCount: getSaleItemCount(sale),
    paymentMethod: sale.payment?.method || 'OTHER',
    status: getSaleStatus(sale),
    tableNumber: sale.tableNumber,
    total: toNumber(sale.summary?.grandTotal),
  };
}

function mapInvoiceDetail(sale) {
  const staff = getSaleStaff(sale);
  const createdAt = new Date(sale.createdAt);

  return {
    id: String(sale._id),
    invoiceNumber: getSaleInvoiceNumber(sale),
    staff,
    date: getDateKey(createdAt),
    time: createdAt.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }),
    tableNumber: sale.tableNumber,
    paymentMethod: sale.payment?.method || 'OTHER',
    paymentStatus: sale.payment?.status || 'PAID',
    status: getSaleStatus(sale),
    items: (sale.items || []).map((item) => ({
      id: String(item.productId || item.name),
      name: item.name,
      price: toNumber(item.price),
      quantity: toNumber(item.quantity),
      total: toNumber(item.price) * toNumber(item.quantity),
    })),
    summary: {
      discount: toNumber(sale.summary?.discount),
      grandTotal: toNumber(sale.summary?.grandTotal),
      serviceCharge: toNumber(sale.summary?.serviceChargeAmount),
      subtotal: toNumber(sale.summary?.subtotal),
      vat: toNumber(sale.summary?.vatAmount),
    },
  };
}

function buildSalesReportPayload(sales, range) {
  const summary = createSalesReportSummary();
  const staffById = new Map();

  sales.forEach((sale) => {
    addSaleToReportSummary(summary, sale);
    const staff = getSaleStaff(sale);
    const current = staffById.get(staff.id) || { ...staff, averagePerBill: 0, billCount: 0, itemCount: 0, totalSales: 0 };
    current.billCount += 1;
    current.itemCount += getSaleItemCount(sale);
    current.totalSales += toNumber(sale.summary?.grandTotal);
    current.averagePerBill = current.billCount > 0 ? current.totalSales / current.billCount : 0;
    staffById.set(staff.id, current);
  });

  return {
    range: {
      dateFrom: range.start.toISOString(),
      dateTo: range.end.toISOString(),
      mode: range.mode,
    },
    summary,
    staff: Array.from(staffById.values()).sort((firstStaff, secondStaff) => secondStaff.totalSales - firstStaff.totalSales),
  };
}

async function getSalesReport(query = {}) {
  const range = getReportDateRange(query);
  const sales = await Sale.find({ createdAt: { $gte: range.start, $lte: range.end } }).sort({ createdAt: -1 }).lean();
  return buildSalesReportPayload(sales, range);
}

async function getStaffSalesReport(staffId, query = {}) {
  const range = getReportDateRange(query);
  const sales = await Sale.find(createStaffSaleFilter(staffId, range)).sort({ createdAt: -1 }).lean();
  const report = buildSalesReportPayload(sales, range);
  const staff = report.staff[0] || { averagePerBill: 0, billCount: 0, id: String(staffId), itemCount: 0, name: 'ບໍ່ພົບພະນັກງານ', role: '', totalSales: 0, username: '' };

  return {
    range: report.range,
    staff,
    summary: report.summary,
    invoices: sales.map(mapInvoiceRow),
  };
}

async function getStaffInvoiceReport(staffId, invoiceId) {
  const sale = await Sale.findOne({ _id: invoiceId, $or: createStaffSaleFilter(staffId, { start: new Date(0), end: new Date('9999-12-31T23:59:59.999Z') }).$or }).lean();
  if (!sale) throw new ApiError(404, 'Invoice not found');
  return mapInvoiceDetail(sale);
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

module.exports = { getDashboardTodayReport, getProfitReport, getSalesReport, getStaffInvoiceReport, getStaffSalesReport };

