const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    cartItemId: { type: String, default: '' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    barcode: { type: String, default: '' },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
    size: { type: String, enum: ['small', 'regular', 'large'], default: 'regular' },
    specialInstructions: { type: [String], default: [] },
  },
  { _id: false },
);

const saleSummarySchema = new mongoose.Schema(
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

const saleCashierSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
  },
  { _id: false },
);

const saleCustomerSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { _id: false },
);
const saleOrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    orderNumber: { type: String, required: true },
    orderType: { type: String, enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'], default: 'DINE_IN' },
    status: { type: String, enum: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'], default: 'COMPLETED' },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED'], default: 'PAID' },
  },
  { _id: false },
);

const salePaymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    method: { type: String, enum: ['CASH', 'QR', 'BANK_TRANSFER', 'CARD', 'OTHER', 'CREDIT'], required: true, default: 'CASH' },
    status: { type: String, enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED'], default: 'PAID' },
    amount: { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, default: 0, min: 0 },
    changeAmount: { type: Number, default: 0, min: 0 },
    reference: { type: String, trim: true, default: '' },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    tableNumber: { type: Number, required: true },
    items: { type: [saleItemSchema], default: [] },
    summary: { type: saleSummarySchema, required: true },
    cashier: { type: saleCashierSchema, required: true },
    customer: { type: saleCustomerSchema, default: null },
    order: { type: saleOrderSchema, default: null },
    payment: { type: salePaymentSchema, default: null },
    shiftId: { type: String, trim: true, default: '' },
    shiftNumber: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ 'cashier.id': 1, createdAt: -1 });
saleSchema.index({ 'payment.method': 1, createdAt: -1 });
saleSchema.index({ 'order.id': 1 });
saleSchema.index({ 'customer.id': 1, createdAt: -1 });
saleSchema.index({ shiftId: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);



