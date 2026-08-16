const supplierService = require('../services/supplierService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listSuppliers = asyncHandler(async (req, res) => {
  const result = await supplierService.listSuppliers(req.query);
  return sendList(res, result.data, result.pagination);
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplierById(req.params.id);
  return sendSuccess(res, supplier);
});

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body);
  return sendSuccess(res, supplier, 'Supplier created', 201);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body);
  return sendSuccess(res, supplier, 'Supplier updated');
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.deleteSupplier(req.params.id);
  return sendSuccess(res, result, 'Supplier deleted');
});

module.exports = {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
};
