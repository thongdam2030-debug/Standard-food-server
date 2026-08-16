const mongoose = require('mongoose');

const expenseUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
  },
  { _id: false },
);

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: { type: String, required: true, unique: true },
    category: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.000001 },
    paidBy: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'], default: 'CASH' },
    expenseDate: { type: Date, default: Date.now, index: true },
    note: { type: String, trim: true, default: '' },
    reference: { type: String, trim: true, default: '' },
    user: { type: expenseUserSchema, required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ createdAt: -1 });
expenseSchema.index({ 'user.id': 1, expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ paidBy: 1, expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
