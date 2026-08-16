const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function setNormalizedName(next) {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }

  next();
});

module.exports = mongoose.model('Category', categorySchema);
