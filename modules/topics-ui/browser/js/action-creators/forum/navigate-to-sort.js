"use strict";

var forumSortConstants = require('../../constants/forum-sorts');

module.exports = function navigateToSort(sort){
  if(!sort) {
    throw new Error('navigateToSort must be called with a valid sort');
  }

  return {
    type: forumSortConstants.NAVIGATE_TO_SORT,
    route: 'forum',
    sort: sort,
  };
};
