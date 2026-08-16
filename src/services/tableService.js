const Table = require('../models/Table');
const { ApiError } = require('../utils/ApiError');

const DEFAULT_TABLE_COUNT = 20;

function toNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function mapTable(table) {
  const plainTable = typeof table.toObject === 'function' ? table.toObject() : table;
  return {
    id: String(plainTable._id),
    number: plainTable.number,
    name: plainTable.name,
    zone: plainTable.zone,
    capacity: plainTable.capacity,
    sortOrder: plainTable.sortOrder,
    isActive: plainTable.isActive,
    createdAt: plainTable.createdAt,
    updatedAt: plainTable.updatedAt,
  };
}

async function ensureDefaultTables() {
  const totalTables = await Table.countDocuments();

  if (totalTables > 0) {
    return;
  }

  await Table.insertMany(
    Array.from({ length: DEFAULT_TABLE_COUNT }, (_, index) => {
      const number = index + 1;
      return {
        capacity: 4,
        isActive: true,
        name: `Table ${number}`,
        number,
        sortOrder: number,
        zone: 'Main',
      };
    }),
    { ordered: true },
  );
}

async function listTables(query = {}) {
  await ensureDefaultTables();
  const filter = {};

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === true || query.isActive === 'true';
  }

  if (query.zone) {
    filter.zone = normalizeText(query.zone);
  }

  const tables = await Table.find(filter).sort({ sortOrder: 1, number: 1 }).lean();
  return tables.map(mapTable);
}

async function getActiveTableNumbers() {
  await ensureDefaultTables();
  const tables = await Table.find({ isActive: true }).select('number').lean();
  return new Set(tables.map((table) => Number(table.number)));
}

async function ensureValidTableNumber(tableNumber) {
  const number = toNumber(tableNumber);
  if (!Number.isInteger(number) || number < 1) {
    throw new ApiError(400, 'Invalid table number');
  }

  await ensureDefaultTables();
  const table = await Table.findOne({ number, isActive: true }).lean();

  if (!table) {
    throw new ApiError(400, 'Table not found or inactive');
  }

  return number;
}

async function ensureUniqueNumber(number, ignoreId) {
  const existingTable = await Table.findOne({ number }).lean();

  if (existingTable && String(existingTable._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Table number already exists');
  }
}

async function createTable(values) {
  const number = toNumber(values.number);

  if (!Number.isInteger(number) || number < 1) {
    throw new ApiError(400, 'Invalid table number');
  }

  await ensureUniqueNumber(number);
  const table = await Table.create({
    capacity: Math.max(toNumber(values.capacity, 4), 1),
    isActive: values.isActive ?? true,
    name: normalizeText(values.name) || `Table ${number}`,
    number,
    sortOrder: toNumber(values.sortOrder, number),
    zone: normalizeText(values.zone) || 'Main',
  });

  return mapTable(table);
}

async function updateTable(id, values) {
  const table = await Table.findById(id);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  const number = toNumber(values.number, table.number);
  if (!Number.isInteger(number) || number < 1) {
    throw new ApiError(400, 'Invalid table number');
  }

  await ensureUniqueNumber(number, id);
  table.capacity = Math.max(toNumber(values.capacity, table.capacity), 1);
  table.isActive = values.isActive ?? table.isActive;
  table.name = normalizeText(values.name) || `Table ${number}`;
  table.number = number;
  table.sortOrder = toNumber(values.sortOrder, table.sortOrder || number);
  table.zone = normalizeText(values.zone) || 'Main';

  await table.save();
  return mapTable(table);
}

async function deleteTable(id) {
  const table = await Table.findById(id);

  if (!table) {
    throw new ApiError(404, 'Table not found');
  }

  table.isActive = false;
  await table.save();
  return mapTable(table);
}

module.exports = { createTable, deleteTable, ensureDefaultTables, ensureValidTableNumber, getActiveTableNumbers, listTables, updateTable };
