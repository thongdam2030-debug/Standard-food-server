const express = require('express');
const categoryController = require('../controllers/categoryController');
const {
  categoryIdValidators,
  createCategoryValidators,
  listCategoryValidators,
  updateCategoryValidators,
} = require('../validators/categoryValidators');

const router = express.Router();

router.get('/', listCategoryValidators, categoryController.listCategories);
router.get('/:id', categoryIdValidators, categoryController.getCategory);
router.post('/', createCategoryValidators, categoryController.createCategory);
router.put('/:id', updateCategoryValidators, categoryController.updateCategory);
router.delete('/:id', categoryIdValidators, categoryController.deleteCategory);

module.exports = router;
