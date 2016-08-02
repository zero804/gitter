"use strict";

module.exports = function forumCategoryStore(categories = [], filter = 'all') {

  categories = categories.map((cat) => ({
    category: cat,
    active: (cat === filter)
  }));

  categories.unshift({ category: 'all', active: (filter === 'all') });

  const getCategories = () => categories;

  return {
    models: (categories || []),
    getCategories: getCategories
  };
};
