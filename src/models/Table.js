const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      min: 1,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    zone: {
      type: String,
      trim: true,
      default: '',
    },
    capacity: {
      type: Number,
      min: 1,
      default: 4,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

tableSchema.index({ sortOrder: 1, number: 1 });
tableSchema.index({ zone: 1, number: 1 });

module.exports = mongoose.model('Table', tableSchema);
