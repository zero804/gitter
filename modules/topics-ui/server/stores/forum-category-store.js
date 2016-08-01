"use strict";

module.exports = function forumCategoryStore(categories) {

  const getCategories = () => categories;

  return {
    models: (categories || []),
    getCategories: getCategories
  };
};
