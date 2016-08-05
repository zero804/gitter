"use strict";

var forumTagConstants = require('../../constants/forum-tags');

module.exports = function(tag = 'all-tags'){
  return {
    type: forumTagConstants.UPDATE_ACTIVE_TAG,
  };
};
