const Category = require('../models/Category');
const Product = require('../models/Product');
const { ApiError } = require('../utils/ApiError');
const { createPagination, parsePagination } = require('../utils/pagination');
const { escapeRegex, normalizeOptionalString } = require('../utils/strings');

function toBooleanFilter(value) {
  if (value === undefined) {
    return undefined;
  }

  return value === true || value === 'true';
}

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function buildSort(query) {
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
}

async function resolveCategory(values) {
  if (values.categoryId) {
    const category = await Category.findById(values.categoryId).lean();

    if (!category) {
      throw new ApiError(400, 'Category not found');
    }

    return {
      categoryId: category._id,
      categoryName: category.name,
    };
  }

  const categoryName = normalizeOptionalString(values.categoryName);

  if (!categoryName) {
    return {
      categoryId: null,
      categoryName: '',
    };
  }

  const existingCategory = await Category.findOne({ normalizedName: categoryName.toLowerCase() }).lean();

  return {
    categoryId: existingCategory?._id ?? null,
    categoryName: existingCategory?.name ?? categoryName,
  };
}

async function ensureUniqueBarcode(barcode, ignoreId) {
  const normalizedBarcode = normalizeOptionalString(barcode);

  if (!normalizedBarcode) {
    return;
  }

  const existingProduct = await Product.findOne({ barcode: normalizedBarcode }).lean();

  if (existingProduct && String(existingProduct._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Product barcode already exists');
  }
}

async function listProducts(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  const isActive = toBooleanFilter(query.isActive);

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.q) {
    const regex = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
    filter.$or = [{ name: regex }, { barcode: regex }, { categoryName: regex }];
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort(buildSort(query)).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return {
    data: products,
    pagination: createPagination(page, limit, total),
  };
}

async function getProductById(id) {
  const product = await Product.findById(id).lean();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return product;
}

async function createProduct(values) {
  const barcode = normalizeOptionalString(values.barcode);
  await ensureUniqueBarcode(barcode);

  const category = await resolveCategory(values);
  const product = await Product.create({
    barcode,
    name: values.name.trim(),
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    price: toNumber(values.price),
    cost: toNumber(values.cost),
    stock: toNumber(values.stock),
    image: normalizeOptionalString(values.image),
    description: normalizeOptionalString(values.description),
    isActive: values.isActive ?? true,
  });

  return product.toObject();
}

async function updateProduct(id, values) {
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const barcode = normalizeOptionalString(values.barcode);
  await ensureUniqueBarcode(barcode, id);

  const category = await resolveCategory(values);
  product.barcode = barcode;
  product.name = values.name.trim();
  product.categoryId = category.categoryId;
  product.categoryName = category.categoryName;
  product.price = toNumber(values.price);
  product.cost = toNumber(values.cost);
  product.stock = toNumber(values.stock);
  product.image = normalizeOptionalString(values.image);
  product.description = normalizeOptionalString(values.description);

  if (values.isActive !== undefined) {
    product.isActive = values.isActive;
  }

  await product.save();
  return product.toObject();
}


async function decreaseProductStock(items) {
  const quantityByProductId = items.reduce((quantities, item) => {
    const productId = String(item.productId);
    quantities[productId] = (quantities[productId] || 0) + toNumber(item.quantity);
    return quantities;
  }, {});

  const stockMovements = [];

  for (const [productId, quantity] of Object.entries(quantityByProductId)) {
    const product = await Product.findById(productId);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const stockBefore = toNumber(product.stock);
    product.stock = Math.max(stockBefore - quantity, 0);
    await product.save();

    stockMovements.push({
      product: product.toObject(),
      quantity,
      stockAfter: product.stock,
      stockBefore,
    });
  }

  return stockMovements;
}
async function deleteProduct(id) {
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  product.isActive = false;
  await product.save();

  return { deleted: false, deactivated: true };
}

module.exports = {
  createProduct,
  decreaseProductStock,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
};



