"use strict";

var navConstants = require('../../shared/constants/navigation');
var _ = require('lodash');

module.exports = function forumCategoryStore(categories, categoryFilter) {

  categories = (categories || []);
  categoryFilter = (categoryFilter || navConstants.DEFAULT_CATEGORY_NAME);

  categories = categories.map((data) => ({
    category: (data.name || data.category),
    active: (data.slug === categoryFilter),
    slug: data.slug,
    id: data.id
  }));

  categories.unshift({
    category: navConstants.DEFAULT_CATEGORY_NAME,
    slug: navConstants.DEFAULT_CATEGORY_NAME,
    active: (categoryFilter === navConstants.DEFAULT_CATEGORY_NAME),
    id: 'all'
  });

  const mapForSelectControl = () => categories.map((c) => ({
    selected: c.active,
    label: c.category,
    value: c.id,
  }));

  const getById = (id) => _.find(categories, (cat) => cat.id === id);

  const getCategories = () => categories;

  return {
    data: categories,
    getCategories: getCategories,
    mapForSelectControl: mapForSelectControl,
    getById: getById
  };
};
