const Setting = require('../models/Setting');

const SETTINGS_KEY = 'store';
const defaultSettings = {
  key: SETTINGS_KEY,
  storeName: 'StandarFood POS',
  phone: '',
  address: '',
  currencyCode: 'LAK',
  currencyLocale: 'lo-LA',
  defaultVatRate: 0,
  defaultServiceChargeRate: 0,
  lowStockThreshold: 5,
  receiptFooter: 'ຂອບໃຈທີ່ໃຊ້ບໍລິການ',
};

function toNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function clampRate(value) {
  return Math.min(Math.max(toNumber(value), 0), 100);
}

function sanitizeSettings(settings) {
  const source = typeof settings.toObject === 'function' ? settings.toObject() : settings;
  return {
    id: String(source._id || ''),
    storeName: source.storeName || defaultSettings.storeName,
    phone: source.phone || '',
    address: source.address || '',
    currencyCode: source.currencyCode || defaultSettings.currencyCode,
    currencyLocale: source.currencyLocale || defaultSettings.currencyLocale,
    defaultVatRate: toNumber(source.defaultVatRate),
    defaultServiceChargeRate: toNumber(source.defaultServiceChargeRate),
    lowStockThreshold: toNumber(source.lowStockThreshold, 5),
    receiptFooter: source.receiptFooter || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function getSettings() {
  const settings = await Setting.findOneAndUpdate({ key: SETTINGS_KEY }, { $setOnInsert: defaultSettings }, { new: true, upsert: true });
  return sanitizeSettings(settings);
}

async function updateSettings(values) {
  const settings = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        storeName: String(values.storeName || defaultSettings.storeName).trim(),
        phone: String(values.phone || '').trim(),
        address: String(values.address || '').trim(),
        currencyCode: String(values.currencyCode || defaultSettings.currencyCode).trim().toUpperCase(),
        currencyLocale: String(values.currencyLocale || defaultSettings.currencyLocale).trim(),
        defaultVatRate: clampRate(values.defaultVatRate),
        defaultServiceChargeRate: clampRate(values.defaultServiceChargeRate),
        lowStockThreshold: Math.max(toNumber(values.lowStockThreshold, 5), 0),
        receiptFooter: String(values.receiptFooter || '').trim(),
      },
      $setOnInsert: { key: SETTINGS_KEY },
    },
    { new: true, upsert: true, runValidators: true },
  );
  return sanitizeSettings(settings);
}

module.exports = { getSettings, updateSettings };
