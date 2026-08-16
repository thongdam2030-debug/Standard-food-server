const Supplier = require('../models/Supplier');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { escapeRegex, normalizeOptionalString } = require('../utils/strings');

function buildSort(query) {
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
}

async function ensureUniqueName(name, ignoreId) {
  const existingSupplier = await Supplier.findOne({ name: name.trim() }).lean();

  if (existingSupplier && String(existingSupplier._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Supplier name already exists');
  }
}

function buildPayload(values) {
  return {
    address: normalizeOptionalString(values.address),
    contactPerson: normalizeOptionalString(values.contactPerson),
    email: normalizeOptionalString(values.email).toLowerCase(),
    isActive: values.isActive !== undefined ? Boolean(values.isActive) : true,
    name: values.name.trim(),
    note: normalizeOptionalString(values.note),
    phone: normalizeOptionalString(values.phone),
    taxId: normalizeOptionalString(values.taxId),
  };
}

async function listSuppliers(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  if (query.q) {
    const regex = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
    filter.$or = [{ name: regex }, { contactPerson: regex }, { phone: regex }, { email: regex }, { taxId: regex }];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort(buildSort(query)).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(filter),
  ]);

  return {
    data: suppliers,
    pagination: createPagination(page, limit, total),
  };
}

async function getSupplierById(id) {
  const supplier = await Supplier.findById(id).lean();

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  return supplier;
}

async function createSupplier(values) {
  await ensureUniqueName(values.name);
  const supplier = await Supplier.create(buildPayload(values));
  return supplier.toObject();
}

async function updateSupplier(id, values) {
  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  await ensureUniqueName(values.name, id);
  Object.assign(supplier, buildPayload(values));
  await supplier.save();
  return supplier.toObject();
}

async function deleteSupplier(id) {
  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  supplier.isActive = false;
  await supplier.save();
  return { deleted: true };
}

module.exports = {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
};
