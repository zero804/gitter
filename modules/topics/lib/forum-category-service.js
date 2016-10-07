'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var ForumCategory = persistence.ForumCategory;
var Topic = persistence.Topic;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var liveCollections = require('gitter-web-live-collection-events');
var validateCategory = require('./validate-category');
var validators = require('gitter-web-validators');

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
    .sort('order _id')
    .lean()
    .exec();
}

function findByForumIds(ids) {
  if (!ids.length) return [];

  return ForumCategory.find({ forumId: { $in: ids } })
    .sort('order _id')
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
  };

  // see https://github.com/Automattic/mongoose/issues/2901. Mongoose is weird
  // about undefined or null in updates whereas they work fine in creates.
  if (categoryInfo.order) {
    data.order = categoryInfo.order
  }

  var insertData = validateCategory(data);
  var query = {
    forumId: forum._id,
    slug: categoryInfo.slug
  };
  return mongooseUtils.upsert(ForumCategory, query, {
    $setOnInsert: insertData
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

    liveCollections.categories.emit('create', category);

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

/* private */
function updateCategoryFields(categoryId, fields) {
  var query = {
    _id: categoryId
  };
  var update = {
    $set: fields
  };
  return ForumCategory.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec();
}

function updateCategory(user, category, fields) {
  // before doing anything else, see if any of the fields actually changed
  var unchanged = Object.keys(fields).every(function(key) {
    return fields[key] === category[key];
  });
  if (unchanged) return category;

  var known = {};
  if (fields.hasOwnProperty('name')) {
    if (!validators.validateDisplayName(fields.name)) {
      throw new StatusError(400, 'Name is invalid.');
    }
    known.name = fields.name;
  }
  if (fields.hasOwnProperty('slug')) {
    if (!validators.validateSlug(fields.slug)) {
      throw new StatusError(400, 'Slug is invalid.');
    }
    known.slug = fields.slug;
  }

  var userId = user._id;
  var forumId = category.forumId;
  var categoryId = category._id;

  return updateCategoryFields(categoryId, known)
    .then(function(updatedCategory) {
      stats.event('update_category', {
        userId: userId,
        forumId: forumId,
        categoryId: categoryId
      });

      liveCollections.categories.emit('update', updatedCategory);

      return updatedCategory;
    });
}

// TODO: setCategoryOrder

function checkIfCategoryIsDeletable(categoryId) {
  return mongooseUtils.getEstimatedCountForId(Topic, 'categoryId', categoryId, {
      read: 'primary'
    })
    .then(function(topicsTotal) {
      return topicsTotal === 0;
    });
}

function deleteCategory(user, category) {
  var userId = user._id;
  var forumId = category.forumId;
  var categoryId = category._id;

  // NOTE: database transactions would have been really handy here
  return checkIfCategoryIsDeletable(categoryId)
    .then(function(canDelete) {
      if (!canDelete) throw new StatusError(409, 'Category not empty.');
      return ForumCategory.remove().exec();
    })
    .then(function() {
      stats.event('delete_category', {
        userId: userId,
        forumId: forumId,
        categoryId: categoryId,
      });

      liveCollections.categories.emit('remove', category);
    });
}

module.exports = {
  findById: findById,
  findByIdForForum: findByIdForForum,
  findByIds: findByIds,
  findByForumId: findByForumId,
  findByForumIds: Promise.method(findByForumIds),
  findBySlugForForum: findBySlugForForum,
  createCategory: Promise.method(createCategory),
  createCategories: createCategories,
  updateCategory: Promise.method(updateCategory),
  checkIfCategoryIsDeletable: checkIfCategoryIsDeletable,
  deleteCategory: deleteCategory
};
