const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '', index: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    taxId: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

supplierSchema.index({ createdAt: -1 });
supplierSchema.index({ name: 'text', contactPerson: 'text', phone: 'text', email: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
