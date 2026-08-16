const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0 },
    size: { type: String, enum: ['small', 'regular', 'large'], default: 'regular' },
    specialInstructions: { type: [String], default: [] },
  },
  { _id: false },
);

const tableCartSchema = new mongoose.Schema(
  {
    items: { type: [cartItemSchema], default: [] },
    discount: { type: Number, default: 0, min: 0 },
    serviceChargeRate: { type: Number, default: 0, min: 0, max: 100 },
    vatRate: { type: Number, default: 0, min: 0, max: 100 },
    openedAt: { type: Date, default: null },
    reservationName: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    selectedTableNumber: { type: Number, default: null },
    tables: { type: Map, of: tableCartSchema, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Cart', cartSchema);
