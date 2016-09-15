'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var Topic = persistence.Topic;
var ForumCategory = persistence.ForumCategory;
var User = persistence.User;
var debug = require('debug')('gitter:app:topics:topic-service');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateTopic = require('./validate-topic');
var validators = require('gitter-web-validators');
var validateTags = validators.validateTags;
var validateTopicFilter = validators.validateTopicFilter;
var validateTopicSort = validators.validateTopicSort;
var liveCollections = require('gitter-web-live-collection-events');


function findById(topicId) {
  return Topic.findById(topicId)
    .lean()
    .exec();
}

function lookupCategoryIdForForumAndSlug(forumId, slug) {
  return ForumCategory.findOne({
      forumId: forumId,
      slug: slug
    })
    .lean()
    .select('_id')
    .exec();
}

function lookupUserIdForUsername(username) {
  return User.findOne({
      username: username
    })
    .lean()
    .select('_id')
    .exec();
}

function buildTopicQuery(forumId, filter) {
  var query = { forumId: forumId };

  if (filter.tags) {
    query.tags = { $all: filter.tags };
  }

  if (filter.modifiedSince) {
    // either new topics or ones that have been updated (new reply/comment)
    query.$or = [
      { sent: { $gte: filter.modifiedSince } },
      { lastModified: { $gte: filter.modifiedSince } }
    ];
  }

  // we might have to look up the category by forumId&slug or user by username
  var lookups = {};

  if (filter.category) {
    lookups.category = lookupCategoryIdForForumAndSlug(forumId, filter.category);
  }

  if (filter.username) {
    // calling this username and not user so it matches the filter key
    lookups.username = lookupUserIdForUsername(filter.username);
  }

  // short-circuit if we don't have to lookup anything
  if (Object.keys(lookups).length === 0) return Promise.resolve(query);

  return Promise.props(lookups)
    .then(function(results) {
      if (filter.category) {
        if (!results.category) throw new StatusError(404, 'Category not found.');

        query.categoryId = results.category._id;
      }

      if (filter.username) {
        if (!results.username) throw new StatusError(404, 'Username not found.');

        query.userId = results.username._id;
      }

      return query;
    });
}

// TODO: we'll need better ways to get pages of topic results.
function findByForumId(forumId, options) {
  options = options || {};

  var filter = options.filter || {};
  var sort = options.sort || { _id: 1 };

  if (!validateTopicFilter(filter)) {
    throw new StatusError(400, 'Filter is invalid.');
  }

  if (!validateTopicSort(sort)) {
    throw new StatusError(400, 'Sort is invalid.');
  }

  return buildTopicQuery(forumId, filter)
    .then(function(query) {
      return Topic.find(query)
        .sort(sort)
        .lean()
        .exec();
    });
}

function findByForumIds(ids) {
  if (!ids.length) return [];

  return Topic.find({ forumId: { $in: ids } })
    .lean()
    .exec();
}

function findTotalsByForumIds(ids, options) {
  options = options || {};

  return mongooseUtils.getEstimatedCountForIds(Topic, 'forumId', ids, {
    read: options.read
  });
}

function findByIdForForum(forumId, topicId) {
  return findById(topicId)
    .then(function(topic) {
      if (!topic) return null;

      // make sure the topic is in the specified forum
      if (!mongoUtils.objectIDsEqual(topic.forumId, forumId)) return null;

      return topic;
    });
}


function createTopic(user, category, options) {
  // these should be passed in from forum.tags
  var allowedTags = options.allowedTags || [];

  var data = {
    forumId: category.forumId,
    categoryId: category._id,
    userId: user._id,
    title: options.title,
    slug: options.slug,
    tags: options.tags || [],
    sticky: options.sticky || false,
    text: options.text || '',
  };

  var insertData = validateTopic(data, { allowedTags: allowedTags });
  return processText(options.text)
    .then(function(parsedMessage) {
      insertData.html = parsedMessage.html;
      insertData.lang = parsedMessage.lang;
      insertData._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;
      // urls, issues, mentions?

      debug("Creating topic with %j", insertData);

      return Topic.create(insertData);
    })
    .then(function(topic) {
      stats.event('new_topic', {
        userId: user._id,
        forumId: category.forumId,
        topicId: topic._id,
      });

      return topic;
    });
}

function setTopicTags(user, topic, tags, options) {
  tags = tags || [];

  options = options || {};
  // alternatively we could have passed a full forum object just to get to
  // forum.tags
  options.allowedTags = options.allowedTags || [];

  if (!validateTags(tags, options.allowedTags)) {
    throw new StatusError(400, 'Tags are invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  var query = {
    _id: topicId
  };
  var update = {
    $set: {
      tags: tags
    }
  };
  return Topic.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec()
    .then(function(updatedTopic) {
      // log a stats event
      stats.event('update_topic_tags', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        tags: tags
      });

      liveCollections.topics.emit('patch', forumId, topicId, { tags: updatedTopic.tags });

      return updatedTopic;
    });
}

module.exports = {
  findById: findById,
  findByForumId: findByForumId,
  findByForumIds: Promise.method(findByForumIds),
  findTotalsByForumIds: Promise.method(findTotalsByForumIds),
  findByIdForForum: findByIdForForum,
  createTopic: Promise.method(createTopic),
  setTopicTags: Promise.method(setTopicTags)
};
