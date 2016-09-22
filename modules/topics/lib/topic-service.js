'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var assert = require('assert');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var _ = require('lodash');
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
var liveCollections = require('gitter-web-live-collection-events');


var TOPIC_RESULT_LIMIT = 100;

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

function buildTopicQuery(forumIds, filter) {
  assert(forumIds.length > 0);

  var query = {};

  if (forumIds.length === 1) {
    query.forumId = forumIds[0];
  } else {
    query.forumId = { $in: forumIds };
  }

  if (filter.tags) {
    query.tags = { $all: filter.tags };
  }

  if (filter.since) {
    // either new topics or ones that have been updated (new reply/comment)
    query.lastChanged = { $gte: filter.since };
  }

  // we might have to look up the category by forumId&slug or user by username
  var lookups = {};

  if (filter.category) {
    // TODO: this only works for one forumId and in theory we could be calling
    // it with multiple ones when coming via the ForumStrategy, but in that
    // case filtering by a category probably doesn't make much sense anyway.
    lookups.category = lookupCategoryIdForForumAndSlug(forumIds[0], filter.category);
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
  var sort = options.sort || { _id: -1 };

  if (!validators.validateTopicFilter(filter)) {
    throw new StatusError(400, 'Filter is invalid.');
  }

  if (!validators.validateTopicSort(sort)) {
    throw new StatusError(400, 'Sort is invalid.');
  }

  return buildTopicQuery([forumId], filter)
    .then(function(query) {
      return Topic.find(query)
        .sort(sort)
        // TODO: kinda useless without being able to the filter at some value
        // (before id, after id..) and it should probably be configurable up to
        // a limit, but this should do for now.
        .limit(TOPIC_RESULT_LIMIT)
        .lean()
        .exec();
    });
}

function findByForumIds(forumIds, options) {
  if (!forumIds.length) return [];

  options = options || {};

  var filter = options.filter || {};
  var sort = options.sort || { _id: 1 };

  if (!validators.validateTopicFilter(filter)) {
    throw new StatusError(400, 'Filter is invalid.');
  }

  if (!validators.validateTopicSort(sort)) {
    throw new StatusError(400, 'Sort is invalid.');
  }

  return buildTopicQuery(forumIds, filter)
    .then(function(query) {
      return Topic.find(query)
        .sort(sort)
        // TODO: same as above
        .limit(TOPIC_RESULT_LIMIT)
        .lean()
        .exec();
    });
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
    sticky: options.sticky,
    text: options.text || '',
  };

  var insertData = validateTopic(data, { allowedTags: allowedTags });

  // make these all be the exact same instant
  insertData.sent = insertData.lastChanged = insertData.lastModified = new Date();

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

/* private */
function updateTopic(topicId, fields) {
  var query = {
    _id: topicId
  };
  var update = {
    $set: fields,
    $max: {
      // certainly modified, but not necessarily changed or edited.
      lastModified: new Date()
    }
  };
  return Topic.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec();
}

function setTopicTitle(user, topic, title) {
  if (title === topic.title) return topic;

  if (!validators.validateDisplayName(title)) {
    throw new StatusError(400, 'Title is invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return updateTopic(topicId, { title: title })
    .then(function(updatedTopic) {
      stats.event('update_topic_title', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        title: title
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        title: updatedTopic.title,
        lastModified: updatedTopic.lastModified.toISOString()
      });

      return updatedTopic;
    });
}

function setTopicSlug(user, topic, slug) {
  if (slug === topic.slug) return topic;

  if (!validators.validateSlug(slug)) {
    throw new StatusError(400, 'Slug is invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return updateTopic(topicId, { slug: slug })
    .then(function(updatedTopic) {
      stats.event('update_topic_slug', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        slug: slug
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        slug: updatedTopic.slug,
        lastModified: updatedTopic.lastModified.toISOString()
      });

      return updatedTopic;
    });
}

function setTopicTags(user, topic, tags, options) {
  tags = tags || [];

  if (_.isEqual(tags, topic.tags)) return topic;

  options = options || {};
  // alternatively we could have passed a full forum object just to get to
  // forum.tags
  options.allowedTags = options.allowedTags || [];

  if (!validators.validateTags(tags, options.allowedTags)) {
    throw new StatusError(400, 'Tags are invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return updateTopic(topicId, { tags: tags })
    .then(function(updatedTopic) {
      stats.event('update_topic_tags', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        tags: tags
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        tags: updatedTopic.tags,
        lastModified: updatedTopic.lastModified.toISOString()
      });

      return updatedTopic;
    });
}

function setTopicSticky(user, topic, sticky) {
  if (sticky === topic.sticky) return sticky;

  if (!validators.validateSticky(sticky)) {
    throw new StatusError(400, 'Sticky is invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return updateTopic(topicId, { sticky: sticky })
    .then(function(updatedTopic) {
      stats.event('update_topic_sticky', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        sticky: sticky
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        sticky: updatedTopic.sticky,
        lastModified: updatedTopic.lastModified.toISOString()
      });

      return updatedTopic;
    });
}

function setTopicText(user, topic, text) {
  if (text === topic.text) return topic;

  if (!validators.validateMarkdown(text)) {
    throw new StatusError(400, 'Text is invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return processText(text)
    .then(function(parsedMessage) {
      return updateTopic(topicId, {
          // changed edited date because the text changed
          editedAt: new Date(),
          text: text,
          html: parsedMessage.html,
          lang: parsedMessage.lang,
          _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
      })
    })
    .then(function(updatedTopic) {
      stats.event('update_topic_text', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        text: text
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        body: {
          text: updatedTopic.text,
          html: updatedTopic.html,
        },
        editedAt: updatedTopic.editedAt.toISOString(),
        lastModified: updatedTopic.lastModified.toISOString()
      });

      return updatedTopic;
    });
}

function setTopicCategory(user, topic, category) {
  if (mongoUtils.objectIDsEqual(category._id, topic.categoryId)) return topic;

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return updateTopic(topicId, { categoryId: category._id })
    .then(function(updatedTopic) {
      stats.event('update_topic_category', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        categoryId: category._id
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        categoryId: updatedTopic.categoryId,
        lastModified: updatedTopic.lastModified.toISOString()
      });

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
  setTopicTitle: Promise.method(setTopicTitle),
  setTopicSlug: Promise.method(setTopicSlug),
  setTopicTags: Promise.method(setTopicTags),
  setTopicSticky: Promise.method(setTopicSticky),
  setTopicText: Promise.method(setTopicText),
  setTopicCategory: Promise.method(setTopicCategory),
};
