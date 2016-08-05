"use strict";

var forumFilterConstants = require('../../constants/forum-filters');

module.exports = function updateActiveFilter(filter){

  if(!filter) {
    throw new Error('A valid filter value must be passed to updateActiveFilter');
  }

  return {
    type: forumFilterConstants.UPDATE_ACTIVE_FILTER,
    filter: filter,
  };
};
