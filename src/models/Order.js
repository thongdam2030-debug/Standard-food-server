const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    barcode: { type: String, default: '' },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    size: { type: String, enum: ['small', 'regular', 'large'], default: 'regular' },
    specialInstructions: { type: [String], default: [] },
    note: { type: String, default: '' },
    kitchenStatus: {
      type: String,
      enum: ['NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'],
      default: 'NEW',
    },
  },
  { _id: false },
);

const orderSummarySchema = new mongoose.Schema(
  {
    itemCount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    serviceChargeRate: { type: Number, default: 0 },
    serviceChargeAmount: { type: Number, default: 0 },
    vatRate: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  { _id: false },
);

const orderCustomerSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { _id: false },
);
const orderEmployeeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    tableNumber: { type: Number, required: true },
    orderType: { type: String, enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'], default: 'DINE_IN' },
    status: {
      type: String,
      enum: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED'], default: 'PAID' },
    items: { type: [orderItemSchema], default: [] },
    summary: { type: orderSummarySchema, required: true },
    employee: { type: orderEmployeeSchema, required: true },
    customer: { type: orderCustomerSchema, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ 'employee.id': 1, createdAt: -1 });
orderSchema.index({ 'customer.id': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
