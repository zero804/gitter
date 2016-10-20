"use strict";

var _ = require('lodash');
var navConstants = require('../../shared/constants/navigation');
var parseCategory = require('../../shared/parse/category');

module.exports = function forumCategoryStore(categories, activeCategoryConstant) {

  categories = (categories || []);
  activeCategoryConstant = activeCategoryConstant || navConstants.DEFAULT_CATEGORY_NAME;

  categories = categories.map((data) => {
    return parseCategory(data, activeCategoryConstant);
  });

  categories.unshift({
    id: navConstants.DEFAULT_CATEGORY_NAME,
    label: 'All',
    category: navConstants.DEFAULT_CATEGORY_NAME,
    active: (activeCategoryConstant === navConstants.DEFAULT_CATEGORY_NAME),
    slug: navConstants.DEFAULT_CATEGORY_NAME,
  });

  const mapForSelectControl = () => categories.map((c) => ({
    selected: c.active,
    label: c.label || c.category,
    value: c.id,
  }));

  const getById = (id) => _.find(categories, (cat) => cat.id === id);

  const getCategories = () => categories;
  const getActiveCategoryName = () => _.find(categories, (category) => category.active)[0].category;

  return {
    data: categories,
    getCategories: getCategories,
    getActiveCategoryName: getActiveCategoryName,
    mapForSelectControl: mapForSelectControl,
    getById: getById
  };
};
