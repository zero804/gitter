"use strict";

module.exports = function forumCategoryStore(categories, categoryFilter) {

  categories = (categories || []);
  categoryFilter = (categoryFilter || 'all');

  categories = categories.map((data) => ({
    category: data.name,
    active: (data.slug === categoryFilter)
  }));

  categories.unshift({ category: 'all', active: (categoryFilter === 'all') });

  const getCategories = () => categories;

  return {
    models: (categories || []),
    getCategories: getCategories
  };
};
