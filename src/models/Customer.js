const mongoose = require('mongoose');

const creditBillItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.000001 },
  },
  { _id: true },
);

const creditBillSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.000001 },
    items: { type: [creditBillItemSchema], default: [] },
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
    createdAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
  },
  { _id: true },
);

const depositedItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'RETURNED'], default: 'ACTIVE' },
    createdAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
  },
  { _id: true },
);

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    creditBills: { type: [creditBillSchema], default: [] },
    depositedItems: { type: [depositedItemSchema], default: [] },
  },
  { timestamps: true },
);

customerSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: 'string', $gt: '' } },
  },
);
customerSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Customer', customerSchema);


