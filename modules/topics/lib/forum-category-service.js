'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var ForumCategory = require('gitter-web-persistence').ForumCategory;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var validateCategory = require('./validate-category');


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

function findByIds(ids) {
  return mongooseUtils.findByIds(ForumCategory, ids);
}

function findByForumId(id) {
  return ForumCategory.find({ forumId: id })
    .lean()
    .exec();
}

function findByForumIds(ids) {
  if (!ids.length) return [];

  return ForumCategory.find({ forumId: { $in: ids } })
    .lean()
    .exec();
}

function findBySlugForForum(forumId, slug) {
  return ForumCategory.findOne({ forumId: forumId, slug: slug })
    .lean()
    .exec();
}


function createCategory(user, forum, categoryInfo) {
  var data = {
    forumId: forum._id,
    name: categoryInfo.name,
    slug: categoryInfo.slug,
    // TODO: uncomment as soon as we added it to the schema
    //order: categoryInfo.order
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

function createCategories(user, forum, categoriesInfo) {
  // TODO: change to using a bulk operation? Can't really think of a way of
  // doing that without duplicating code and we're just inserting three
  // categories (at the time of writing.)
  return Promise.map(categoriesInfo, function(categoryInfo) {
    return createCategory(user, forum, categoryInfo);
  });
}

module.exports = {
  findById: findById,
  findByIdForForum: findByIdForForum,
  findByIds: findByIds,
  findByForumId: findByForumId,
  findByForumIds: Promise.method(findByForumIds),
  findBySlugForForum: findBySlugForForum,
  createCategory: createCategory,
  createCategories: createCategories
};
