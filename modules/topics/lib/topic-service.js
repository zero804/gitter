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
var Reply = persistence.Reply;
var Comment = persistence.Comment;
var ForumSubscription = persistence.ForumSubscription;
var ForumNotification = persistence.ForumNotification;
var ForumReaction = persistence.ForumReaction;
var User = persistence.User;
var debug = require('debug')('gitter:app:topics:topic-service');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateTopic = require('./validate-topic');
var validators = require('gitter-web-validators');
var liveCollections = require('gitter-web-live-collection-events');
var topicNotificationEvents = require('gitter-web-topic-notifications/lib/forum-notification-events');
var topicSequencer = require('./topic-sequencer');

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
  var sort = options.sort || { _id: -1 };

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
  var forumId = category.forumId;

  var data = {
    forumId: forumId,
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

  return Promise.join(
      processText(options.text),
      topicSequencer.getNextTopicNumber(forumId))
    .then(function(parsedMessage, number) {
      insertData.number = number;
      insertData.html = parsedMessage.html;
      insertData.lang = parsedMessage.lang;
      insertData._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;
      // urls, issues, mentions?

      debug("Creating topic with %j", insertData);

      return Topic.create(insertData);
    })
    .tap(function(topic) {
      return topicNotificationEvents.createTopic(topic);
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
function updateTopicFields(topicId, fields) {
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

function updateTopic(user, topic, fields) {
  // This function is for updating the core user fields: title, slug & text.

  // before doing anything else, see if any of the fields actually changed
  var unchanged = Object.keys(fields).every(function(key) {
    return fields[key] === topic[key];
  });
  if (unchanged) return topic;

  // Only update the known fields. Not just anything that gets passed in.
  var known = {};
  if (fields.hasOwnProperty('title')) {
    if (!validators.validateDisplayName(fields.title)) {
      throw new StatusError(400, 'Title is invalid.');
    }
    known.title = fields.title;
  }
  if (fields.hasOwnProperty('slug')) {
    if (!validators.validateSlug(fields.slug)) {
      throw new StatusError(400, 'Slug is invalid.');
    }
    known.slug = fields.slug;
  }
  if (fields.hasOwnProperty('text')) {
    if (!validators.validateMarkdown(fields.text)) {
      throw new StatusError(400, 'Text is invalid.');
    }
    known.text = fields.text;
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return Promise.try(function() {
      // If the text field was passed in, also render the new markdown and
      // update the related fields too.
      if (known.text) {
        return processText(known.text)
          .then(function(parsedMessage) {
            return {
              editedAt: new Date(),
              text: known.text,
              html: parsedMessage.html,
              lang: parsedMessage.lang,
              _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
            }
          });
      } else {
        // no text, no text/markdown related fields to update
        return {};
      }
    })
    .then(function(textFields) {
      var update = Object.assign({}, known, textFields);
      return updateTopicFields(topicId, update)
    })
    .then(function(updatedTopic) {
      stats.event('update_topic', {
        userId: userId,
        forumId: forumId,
        topicId: topicId
      });

      liveCollections.topics.emit('update', updatedTopic);

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

  return updateTopicFields(topicId, { tags: tags })
    .then(function(updatedTopic) {
      stats.event('update_topic_tags', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        tags: tags
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        tags: updatedTopic.tags,
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

  return updateTopicFields(topicId, { sticky: sticky })
    .then(function(updatedTopic) {
      stats.event('update_topic_sticky', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        sticky: sticky
      });

      liveCollections.topics.emit('patch', forumId, topicId, {
        sticky: updatedTopic.sticky,
      });

      return updatedTopic;
    });
}

function setTopicCategory(user, topic, category) {
  assert(category._id);

  if (mongoUtils.objectIDsEqual(category._id, topic.categoryId)) return topic;

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return updateTopicFields(topicId, { categoryId: category._id })
    .then(function(updatedTopic) {
      stats.event('update_topic_category', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        categoryId: category._id
      });

      liveCollections.topics.emit('update', updatedTopic);

      return updatedTopic;
    });
}

function deleteTopic(user, topic) {
  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  return Promise.join(
      Topic.remove({ _id: topicId }).exec(),
      Reply.remove({ topicId: topicId }).exec(),
      Comment.remove({ topicId: topicId }).exec(),
      ForumSubscription.remove({ topicId: topicId }).exec(),
      ForumNotification.remove({ topicId: topicId }).exec(),
      ForumReaction.remove({ topicId: topicId }).exec())
    .then(function() {
      stats.event('delete_topic', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
      });

      liveCollections.topics.emit('remove', topic);
    });
}

module.exports = {
  findById: findById,
  findByForumId: findByForumId,
  findByForumIds: Promise.method(findByForumIds),
  findTotalsByForumIds: Promise.method(findTotalsByForumIds),
  findByIdForForum: findByIdForForum,
  createTopic: Promise.method(createTopic),
  updateTopic: Promise.method(updateTopic),
  setTopicTags: Promise.method(setTopicTags),
  setTopicSticky: Promise.method(setTopicSticky),
  setTopicCategory: Promise.method(setTopicCategory),
  deleteTopic: deleteTopic
};
