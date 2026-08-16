const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    sku: { type: String, trim: true, default: '' },
    unit: { type: String, required: true, trim: true, default: 'unit' },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, min: 0, default: 0 },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true },
    supplierName: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ingredientSchema.index({ name: 'text', sku: 'text', supplierName: 'text' });

module.exports = mongoose.model('Ingredient', ingredientSchema);
