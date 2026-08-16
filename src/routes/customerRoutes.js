const express = require('express');
const customerController = require('../controllers/customerController');
const {
  creditBillIdValidators,
  creditBillValidators,
  createCustomerValidators,
  customerIdValidators,
  depositedItemIdValidators,
  depositedItemValidators,
  listCustomerValidators,
  updateCustomerValidators,
} = require('../validators/customerValidators');

const router = express.Router();

router.get('/', listCustomerValidators, customerController.listCustomers);
router.get('/:id', customerIdValidators, customerController.getCustomer);
router.post('/', createCustomerValidators, customerController.createCustomer);
router.put('/:id', updateCustomerValidators, customerController.updateCustomer);
router.post('/:id/credit-bills', creditBillValidators, customerController.addCreditBill);
router.patch('/:id/credit-bills/:billId/pay', creditBillIdValidators, customerController.markCreditBillPaid);
router.post('/:id/deposits', depositedItemValidators, customerController.addDepositedItem);
router.patch('/:id/deposits/:itemId/return', depositedItemIdValidators, customerController.markDepositedItemReturned);
router.delete('/:id', customerIdValidators, customerController.deleteCustomer);

module.exports = router;

