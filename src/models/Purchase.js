const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const supplierSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
  },
  { _id: false },
);

const userSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
  },
  { _id: false },
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    supplier: { type: supplierSnapshotSchema, required: true },
    items: { type: [purchaseItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'], default: 'ORDERED', index: true },
    paymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID', index: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    purchaseDate: { type: Date, default: Date.now, index: true },
    receivedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: '' },
    user: { type: userSnapshotSchema, required: true },
  },
  { timestamps: true },
);

purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ supplierId: 1, purchaseDate: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
