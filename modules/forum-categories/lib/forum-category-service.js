'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var assert = require('assert');
var StatusError = require('statuserror');
var ForumCategory = require('gitter-web-persistence').ForumCategory;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var debug = require('debug')('gitter:app:forums:forum-category-service');

function createCategory(user, forum, categoryInfo) {
  var query = {
    forumId: forum._id,
    slug: categoryInfo.slug
  };
  return mongooseUtils.upsert(ForumCategory, query, {
      $setOnInsert: {
        forumId: forum._id,
        name: categoryInfo.name,
        slug: categoryInfo.slug
      }
    })
    .spread(function(category, updatedExisting) {
      if (updatedExisting) {
        throw new StatusError(409);
      }

      stats.event('new_forum_category', {
        forumId: forum._id,
        categoryId: category._id,
        userId: user._id,
        name: category.name,
        slug: category.slug
      });

      return category;
    });
}

module.exports = {
  createCategory: createCategory
};
