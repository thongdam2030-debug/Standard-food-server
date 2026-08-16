const mongoose = require('mongoose');

const shiftUserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
  },
  { _id: false },
);

const shiftSummarySchema = new mongoose.Schema(
  {
    cashSales: { type: Number, default: 0, min: 0 },
    nonCashSales: { type: Number, default: 0, min: 0 },
    totalSales: { type: Number, default: 0, min: 0 },
    billCount: { type: Number, default: 0, min: 0 },
    expectedCash: { type: Number, default: 0, min: 0 },
    actualCash: { type: Number, default: 0, min: 0 },
    difference: { type: Number, default: 0 },
  },
  { _id: false },
);

const shiftSchema = new mongoose.Schema(
  {
    shiftNumber: { type: String, required: true, unique: true },
    cashier: { type: shiftUserSchema, required: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
    openingCash: { type: Number, required: true, min: 0, default: 0 },
    closingCash: { type: Number, min: 0, default: 0 },
    openedAt: { type: Date, default: Date.now, index: true },
    closedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: '' },
    closingNote: { type: String, trim: true, default: '' },
    summary: { type: shiftSummarySchema, default: () => ({}) },
  },
  { timestamps: true },
);

shiftSchema.index({ 'cashier.id': 1, status: 1, openedAt: -1 });
shiftSchema.index({ status: 1, openedAt: -1 });

module.exports = mongoose.model('Shift', shiftSchema);
