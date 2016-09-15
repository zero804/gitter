'use strict';

var validateTags = require('./validate-tags');
var validateSlug = require('./validate-slug');
var validateUsername = require('./validate-username');
var _ = require('lodash');

function validateTagsFilter(tags) {
  if (!Array.isArray(tags)) return false;
  return validateTags(tags);
}

function validateCategoryFilter(category) {
  return validateSlug(category);
}

function validateUsernameFilter(username) {
  return validateUsername(username);
}

function validateModifiedSinceFilter(modifiedSince) {
  return _.isDate(modifiedSince);
}

var knownFilters = {
  tags: validateTagsFilter,
  category: validateCategoryFilter,
  username: validateUsernameFilter,
  modifiedSince: validateModifiedSinceFilter
};

function validateTopicFilter(filter) {
  return Object.keys(filter).every(function(key) {
    var validator = knownFilters[key];

    if (!validator) return false;

    return validator(filter[key]);
  });
}

module.exports = validateTopicFilter;
