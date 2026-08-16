const cartService = require('../services/cartService');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getCart = asyncHandler(async (req, res) => sendSuccess(res, await cartService.getCart(req.user._id)));
const addCartItem = asyncHandler(async (req, res) => sendSuccess(res, await cartService.addCartItem(req.user._id, req.body.productId, Number(req.body.quantity || 1), req.body.options), 'Cart updated'));
const setCartItemQuantity = asyncHandler(async (req, res) => sendSuccess(res, await cartService.setCartItemQuantity(req.user._id, req.params.cartItemId, Number(req.body.quantity)), 'Cart updated'));
const removeCartItem = asyncHandler(async (req, res) => sendSuccess(res, await cartService.removeCartItem(req.user._id, req.params.cartItemId), 'Cart updated'));
const setCartDiscount = asyncHandler(async (req, res) => sendSuccess(res, await cartService.setCartDiscount(req.user._id, Number(req.body.discount)), 'Cart updated'));
const setCartServiceChargeRate = asyncHandler(async (req, res) => sendSuccess(res, await cartService.setCartServiceChargeRate(req.user._id, Number(req.body.serviceChargeRate)), 'Cart updated'));
const setCartVatRate = asyncHandler(async (req, res) => sendSuccess(res, await cartService.setCartVatRate(req.user._id, Number(req.body.vatRate)), 'Cart updated'));
const setCartTableNumber = asyncHandler(async (req, res) => sendSuccess(res, await cartService.setCartTableNumber(req.user._id, req.body.tableNumber), 'Cart updated'));
const openTable = asyncHandler(async (req, res) => sendSuccess(res, await cartService.openTable(req.user._id, req.body.tableNumber), 'Table opened'));
const reserveTable = asyncHandler(async (req, res) => sendSuccess(res, await cartService.reserveTable(req.user._id, req.body.tableNumber, req.body.reservationName), 'Table reserved'));
const cancelTableReservation = asyncHandler(async (req, res) => sendSuccess(res, await cartService.cancelTableReservation(req.user._id, req.body.tableNumber), 'Reservation cancelled'));
const cancelOpenTable = asyncHandler(async (req, res) => sendSuccess(res, await cartService.cancelOpenTable(req.user._id, req.body.tableNumber), 'Table closed'));
const moveTable = asyncHandler(async (req, res) => sendSuccess(res, await cartService.moveTable(req.user._id, req.body.sourceTableNumber, req.body.targetTableNumber), 'Table moved'));
const mergeTables = asyncHandler(async (req, res) => sendSuccess(res, await cartService.mergeTables(req.user._id, req.body.sourceTableNumber, req.body.targetTableNumber), 'Tables merged'));
const clearCart = asyncHandler(async (req, res) => sendSuccess(res, await cartService.clearCart(req.user._id), 'Cart cleared'));

module.exports = {
  addCartItem,
  cancelOpenTable,
  cancelTableReservation,
  clearCart,
  getCart,
  mergeTables,
  moveTable,
  openTable,
  removeCartItem,
  reserveTable,
  setCartDiscount,
  setCartItemQuantity,
  setCartServiceChargeRate,
  setCartTableNumber,
  setCartVatRate,
};
