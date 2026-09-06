const mongoose = require('mongoose');

const paymentCashierSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    shiftId: { type: String, trim: true, default: '' },
    shiftNumber: { type: String, trim: true, default: '' },
    method: { type: String, enum: ['CASH', 'QR', 'BANK_TRANSFER', 'CARD', 'OTHER', 'CREDIT'], required: true, default: 'CASH' },
    status: { type: String, enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED'], default: 'PAID' },
    amount: { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, default: 0, min: 0 },
    changeAmount: { type: Number, default: 0, min: 0 },
    reference: { type: String, trim: true, default: '' },
    cashier: { type: paymentCashierSchema, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ method: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ saleId: 1 });
paymentSchema.index({ shiftId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

