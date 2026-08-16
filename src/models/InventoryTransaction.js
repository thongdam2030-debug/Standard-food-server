const mongoose = require('mongoose');

const userSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    username: { type: String, default: '' },
    role: { type: String, default: '' },
  },
  { _id: false },
);

const inventoryTransactionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    categoryName: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    stockBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    stockAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    referenceType: {
      type: String,
      trim: true,
      default: '',
    },
    referenceId: {
      type: String,
      trim: true,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    user: {
      type: userSnapshotSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

inventoryTransactionSchema.index({ createdAt: -1 });
inventoryTransactionSchema.index({ productId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
