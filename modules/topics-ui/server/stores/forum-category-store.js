"use strict";

var navConstants = require('../../shared/constants/navigation');

module.exports = function forumCategoryStore(categories, categoryFilter) {

  categories = (categories || []);
  categoryFilter = (categoryFilter || navConstants.DEFAULT_CATEGORY_NAME);

  categories = categories.map((data) => ({
    category: data.name,
    active: (data.slug === categoryFilter),
    slug: data.slug
  }));

  categories.unshift({
    category: navConstants.DEFAULT_CATEGORY_NAME,
    active: (categoryFilter === navConstants.DEFAULT_CATEGORY_NAME)
  });

  const getCategories = () => categories;

  return {
    models: (categories || []),
    getCategories: getCategories
  };
};
