const mongoose = require('mongoose');

const recipeItemSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    ingredientName: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 0.000001 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const recipeSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    productName: { type: String, required: true, trim: true },
    items: { type: [recipeItemSchema], default: [] },
    totalCost: { type: Number, required: true, min: 0, default: 0 },
    note: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

recipeSchema.index({ productName: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
