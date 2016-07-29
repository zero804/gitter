"use strict";

module.exports = function forumCategoryStore(categories) {

  function getCategories(){
    return categories;
  }

  return {
    getCategories: getCategories
  };
};
