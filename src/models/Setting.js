const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'store' },
    storeName: { type: String, trim: true, default: 'StandarFood POS' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    currencyCode: { type: String, trim: true, uppercase: true, default: 'LAK' },
    currencyLocale: { type: String, trim: true, default: 'lo-LA' },
    defaultVatRate: { type: Number, min: 0, max: 100, default: 0 },
    defaultServiceChargeRate: { type: Number, min: 0, max: 100, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    receiptFooter: { type: String, trim: true, default: 'ຂອບໃຈທີ່ໃຊ້ບໍລິການ' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Setting', settingSchema);
