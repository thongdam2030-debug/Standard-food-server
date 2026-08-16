const express = require('express');
const expenseController = require('../controllers/expenseController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createExpenseValidators, expenseIdValidators, listExpenseValidators, updateExpenseValidators } = require('../validators/expenseValidators');

const router = express.Router();

router.use(requireAuth, requireRole('owner', 'cashier'));
router.get('/', listExpenseValidators, expenseController.listExpenses);
router.get('/summary', listExpenseValidators, expenseController.getExpenseSummary);
router.post('/', createExpenseValidators, expenseController.createExpense);
router.put('/:id', updateExpenseValidators, expenseController.updateExpense);
router.delete('/:id', expenseIdValidators, expenseController.deleteExpense);

module.exports = router;
