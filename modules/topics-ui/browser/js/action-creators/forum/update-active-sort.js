"use strict";

var forumSortConstants = require('../../constants/forum-sorts');

module.exports = function updateActiveSort(sort) {

  if(!sort) {
    throw new Error('A valid sort value must be passed to updateActiveSort');
  }

  return {
    type: forumSortConstants.UPDATE_ACTIVE_SORT,
    sort: sort,
  };
};
