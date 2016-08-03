"use strict";

module.exports = function forumCategoryStore(categories = [], categoryFilter = 'all') {

  categories = categories.map((cat) => ({
    category: cat,
    active: (cat === categoryFilter)
  }));

  categories.unshift({ category: 'all', active: (categoryFilter === 'all') });

  const getCategories = () => categories;

  return {
    models: (categories || []),
    getCategories: getCategories
  };
};
