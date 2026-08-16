const express = require('express');
const productController = require('../controllers/productController');
const {
  createProductValidators,
  decreaseProductStockValidators,
  listProductValidators,
  productIdValidators,
  updateProductValidators,
} = require('../validators/productValidators');

const router = express.Router();

router.get('/', listProductValidators, productController.listProducts);
router.post('/stock/decrease', decreaseProductStockValidators, productController.decreaseProductStock);
router.get('/:id', productIdValidators, productController.getProduct);
router.post('/', createProductValidators, productController.createProduct);
router.put('/:id', updateProductValidators, productController.updateProduct);
router.delete('/:id', productIdValidators, productController.deleteProduct);

module.exports = router;

