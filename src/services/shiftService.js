const Payment = require('../models/Payment');
const Shift = require('../models/Shift');
const { ApiError } = require('../utils/ApiError');

function sanitizeUser(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createShiftNumber(date = new Date()) {
  const dateKey = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('');
  const timeKey = [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0'), String(date.getSeconds()).padStart(2, '0')].join('');
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SHIFT-${dateKey}-${timeKey}-${suffix}`;
}

function mapShift(shift) {
  const plainShift = typeof shift.toObject === 'function' ? shift.toObject() : shift;
  return {
    id: String(plainShift._id),
    shiftNumber: plainShift.shiftNumber,
    cashier: plainShift.cashier,
    status: plainShift.status,
    openingCash: plainShift.openingCash,
    closingCash: plainShift.closingCash,
    openedAt: plainShift.openedAt,
    closedAt: plainShift.closedAt,
    note: plainShift.note,
    closingNote: plainShift.closingNote,
    summary: plainShift.summary,
    createdAt: plainShift.createdAt,
    updatedAt: plainShift.updatedAt,
  };
}

async function getOpenShiftForUser(user) {
  const shift = await Shift.findOne({ 'cashier.id': String(user._id || user.id), status: 'OPEN' }).sort({ openedAt: -1 });
  if (!shift) return null;

  shift.summary = await calculateShiftSummary(shift, shift.summary?.actualCash || shift.openingCash);
  return mapShift(shift);
}

async function getOpenShiftDocumentForUser(user) {
  return Shift.findOne({ 'cashier.id': String(user._id || user.id), status: 'OPEN' }).sort({ openedAt: -1 });
}

async function listShifts(user) {
  const filter = user.role === 'owner' ? {} : { 'cashier.id': String(user._id || user.id) };
  const shifts = await Shift.find(filter).sort({ openedAt: -1 }).limit(100);
  const mappedShifts = [];

  for (const shift of shifts) {
    if (shift.status === 'OPEN') {
      shift.summary = await calculateShiftSummary(shift, shift.summary?.actualCash || shift.openingCash);
    }
    mappedShifts.push(mapShift(shift));
  }

  return mappedShifts;
}

async function openShift(user, values = {}) {
  const existingShift = await getOpenShiftDocumentForUser(user);

  if (existingShift) {
    throw new ApiError(409, 'Shift is already open');
  }

  const openingCash = Math.max(toNumber(values.openingCash), 0);
  const shift = await Shift.create({
    cashier: sanitizeUser(user),
    note: normalizeText(values.note),
    openingCash,
    shiftNumber: createShiftNumber(),
    status: 'OPEN',
    summary: {
      actualCash: openingCash,
      expectedCash: openingCash,
    },
  });

  return mapShift(shift);
}

async function calculateShiftSummary(shift, actualCash = shift.openingCash) {
  const payments = await Payment.find({ shiftId: String(shift._id), status: 'PAID' }).lean();
  const cashSales = payments.filter((payment) => payment.method === 'CASH').reduce((total, payment) => total + toNumber(payment.amount), 0);
  const totalSales = payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const nonCashSales = totalSales - cashSales;
  const expectedCash = toNumber(shift.openingCash) + cashSales;
  const normalizedActualCash = Math.max(toNumber(actualCash), 0);

  return {
    actualCash: normalizedActualCash,
    billCount: payments.length,
    cashSales,
    difference: normalizedActualCash - expectedCash,
    expectedCash,
    nonCashSales,
    totalSales,
  };
}

async function closeShift(user, values = {}) {
  const shift = await getOpenShiftDocumentForUser(user);

  if (!shift) {
    throw new ApiError(404, 'No open shift found');
  }

  const summary = await calculateShiftSummary(shift, values.closingCash);
  shift.closingCash = summary.actualCash;
  shift.closedAt = new Date();
  shift.closingNote = normalizeText(values.closingNote);
  shift.status = 'CLOSED';
  shift.summary = summary;
  await shift.save();

  return mapShift(shift);
}

async function attachOpenShiftToPayment(user, payment) {
  const shift = await getOpenShiftDocumentForUser(user);

  if (!shift) {
    return null;
  }

  payment.shiftId = String(shift._id);
  payment.shiftNumber = shift.shiftNumber;
  await payment.save();
  return mapShift(shift);
}

module.exports = { attachOpenShiftToPayment, closeShift, getOpenShiftForUser, listShifts, openShift };

