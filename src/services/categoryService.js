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

async function listCategories(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  const isActive = toBooleanFilter(query.isActive);

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  if (query.q) {
    filter.name = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
  }

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  const categoryIds = categories.map((category) => category._id);
  const productCounts = await Product.aggregate([
    { $match: { categoryId: { $in: categoryIds } } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(productCounts.map((item) => [String(item._id), item.count]));

  return {
    data: categories.map((category) => ({
      ...category,
      productCount: countMap.get(String(category._id)) || 0,
    })),
    pagination: createPagination(page, limit, total),
  };
}

async function getCategoryById(id) {
  const category = await Category.findById(id).lean();

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const productCount = await Product.countDocuments({ categoryId: id });
  return { ...category, productCount };
}

async function ensureUniqueCategoryName(name, ignoreId) {
  const normalizedName = name.trim().toLowerCase();
  const existingCategory = await Category.findOne({ normalizedName }).lean();

  if (existingCategory && String(existingCategory._id) !== String(ignoreId || '')) {
    throw new ApiError(409, 'Category name already exists');
  }
}

async function createCategory(values) {
  const name = values.name.trim();
  await ensureUniqueCategoryName(name);

  const category = await Category.create({
    name,
    isActive: values.isActive ?? true,
  });

  return category.toObject();
}

async function updateCategory(id, values) {
  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const name = values.name.trim();
  await ensureUniqueCategoryName(name, id);

  const oldName = category.name;
  category.name = name;

  if (values.isActive !== undefined) {
    category.isActive = values.isActive;
  }

  await category.save();

  if (oldName !== name) {
    await Product.updateMany({ categoryId: category._id }, { categoryName: name });
  }

  return category.toObject();
}

async function deleteCategory(id) {
  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const productCount = await Product.countDocuments({ categoryId: id });

  if (productCount > 0) {
    category.isActive = false;
    await category.save();
    return { deleted: false, deactivated: true, productCount };
  }

  await category.deleteOne();
  return { deleted: true, deactivated: false, productCount: 0 };
}

module.exports = {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
};
