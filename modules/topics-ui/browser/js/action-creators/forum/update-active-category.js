"use strict";

var forumCatConstants = require('../../constants/forum-categories');

module.exports = function updateActiveCategory(category = 'all'){
  return {
    type: forumCatConstants.UPDATE_ACTIVE_CATEGORY,
    category: category
  };
};
