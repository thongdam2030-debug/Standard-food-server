const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { config } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const healthRoutes = require('./routes/healthRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const saleRoutes = require('./routes/saleRoutes');
const settingRoutes = require('./routes/settingRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const tableRoutes = require('./routes/tableRoutes');
const userRoutes = require('./routes/userRoutes');
const { requireAuth, requireRole } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

app.use('/health', healthRoutes);
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', requireAuth, requireRole('owner', 'cashier'), categoryRoutes);
app.use('/api/customers', requireAuth, requireRole('owner', 'cashier'), customerRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', requireAuth, requireRole('owner', 'cashier'), productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/tables', tableRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;














