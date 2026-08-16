const tableService = require('../services/tableService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendList, sendSuccess } = require('../utils/response');

const listTables = asyncHandler(async (req, res) => {
  return sendList(res, await tableService.listTables(req.query));
});

const createTable = asyncHandler(async (req, res) => {
  return sendSuccess(res, await tableService.createTable(req.body), 'Table created', 201);
});

const updateTable = asyncHandler(async (req, res) => {
  return sendSuccess(res, await tableService.updateTable(req.params.id, req.body), 'Table updated');
});

const deleteTable = asyncHandler(async (req, res) => {
  return sendSuccess(res, await tableService.deleteTable(req.params.id), 'Table deactivated');
});

module.exports = { createTable, deleteTable, listTables, updateTable };
