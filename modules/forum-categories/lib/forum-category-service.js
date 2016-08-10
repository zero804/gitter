'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var validators = require('gitter-web-validators');
var ForumCategory = require('gitter-web-persistence').ForumCategory;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var debug = require('debug')('gitter:app:topics:forum-category-service');


function findById(categoryId) {
  return ForumCategory.findById(categoryId)
    .lean()
    .exec();
}

function findByIdForForum(forumId, categoryId) {
  return findById(categoryId)
    .then(function(category) {
      if (!category) return null;

      // make sure the category is in the specified forum
      if (!mongoUtils.objectIDsEqual(category.forumId, forumId)) return null;

      return category;
    });
}

function findBySlugForForum(forumId, slug) {
  return ForumCategory.findOne({ forumId: forumId, slug: slug })
    .lean()
    .exec();
}

function validateCategory(data) {
  if (!validators.validateDisplayName(data.name)) {
    throw new StatusError(400, 'Name is invalid.')
  }

  if (!validators.validateSlug(data.slug)) {
    throw new StatusError(400, 'Slug is invalid.')
  }

  return data;
}

function createCategory(user, forum, categoryInfo) {
  var data = {
    forumId: forum._id,
    name: categoryInfo.name,
    slug: categoryInfo.slug
  };

  return Promise.try(function() {
      return validateCategory(data);
    })
    .then(function(insertData) {
      var query = {
        forumId: forum._id,
        slug: categoryInfo.slug
      };
      return mongooseUtils.upsert(ForumCategory, query, {
        $setOnInsert: insertData
      });
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
  findById: findById,
  findByIdForForum: findByIdForForum,
  findBySlugForForum: findBySlugForForum,
  createCategory: createCategory
};
