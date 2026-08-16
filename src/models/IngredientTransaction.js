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

const ingredientTransactionSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    ingredientName: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['SALE', 'ADJUSTMENT', 'PURCHASE', 'WASTE'], required: true, index: true },
    direction: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    stockBefore: { type: Number, required: true, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
    referenceType: { type: String, trim: true, default: '' },
    referenceId: { type: String, trim: true, default: '' },
    productId: { type: String, trim: true, default: '' },
    productName: { type: String, trim: true, default: '' },
    user: { type: userSnapshotSchema, default: () => ({}) },
  },
  { timestamps: true },
);

ingredientTransactionSchema.index({ createdAt: -1 });
ingredientTransactionSchema.index({ ingredientId: 1, createdAt: -1 });
ingredientTransactionSchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.model('IngredientTransaction', ingredientTransactionSchema);
