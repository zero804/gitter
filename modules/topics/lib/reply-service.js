'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var Topic = require('gitter-web-persistence').Topic;
var Reply = require('gitter-web-persistence').Reply;
var debug = require('debug')('gitter:app:topics:reply-service');
var liveCollections = require('gitter-web-live-collection-events');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateReply = require('./validate-reply');
var _ = require('lodash');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs')

function findById(replyId) {
  return Reply.findById(replyId)
    .lean()
    .exec();
}

// TODO: we'll need better ways to get pages of reply results per topic rather
// than this function to just get all of it.
function findByTopicId(id) {
  return Reply.find({ topicId: id })
    .lean()
    .exec();
}

function findByTopicIds(ids) {
  if (!ids.length) return [];

  return Reply.find({ topicId: { $in: ids } })
    .lean()
    .exec();
}

function findTotalByTopicId(id, options) {
  options = options || {};

  return mongooseUtils.getEstimatedCountForId(Reply, 'topicId', id, {
    read: options.read
  });
}

function findTotalsByTopicIds(ids, options) {
  options = options || {};

  return mongooseUtils.getEstimatedCountForIds(Reply, 'topicId', ids, {
    read: options.read
  });
}

function findByIdForForum(forumId, replyId) {
  return findById(replyId)
    .then(function(reply) {
      if (!reply) return null;

      // make sure the reply is in the specified forum
      if (!mongoUtils.objectIDsEqual(reply.forumId, forumId)) return null;

      return reply;
    });
}

function findByIdForForumAndTopic(forumId, topicId, replyId) {
  return findById(replyId)
    .then(function(reply) {
      if (!reply) return null;

      // make sure the reply is in the specified forum
      if (!mongoUtils.objectIDsEqual(reply.forumId, forumId)) return null;

      // make sure the reply is in the specified topic
      if (!mongoUtils.objectIDsEqual(reply.topicId, topicId)) return null;

      return reply;
    });
}

function updateRepliesTotal(topicId) {
  debug("updateRepliesTotal %s", topicId);

  var query = {
    _id: topicId
  };

  var lastModified = new Date();

  var update = {
    $max: {
      lastModified: lastModified
    }
  };

  return Topic.findOneAndUpdate(query, update, { new: true })
    .exec()
    .bind({
      topic: undefined
    })
    .then(function(topic) {
      this.topic = topic;

      if (topic) {
        debug("topic.lastModified: %s, lastModified: %s", topic.lastModified, lastModified)
      }

      if (!topic || topic.lastModified.getTime() !== lastModified.getTime()) {
        debug('We lost the topic update race.');
        return;
      }

      // if this update won, then patch the live collection with the latest
      // lastModified value and also the new total replies.
      return findTotalByTopicId(topicId)
        .then(function(repliesTotal) {
          liveCollections.topics.emit('patch', topic.forumId, topicId, {
            lastModified: lastModified,
            repliesTotal: repliesTotal
          })
        });
    })
    .then(function() {
      // return the topic that got updated (if it was updated).
      return this.topic;
    });
}

function createReply(user, topic, options) {
  var data = {
    forumId: topic.forumId,
    topicId: topic._id,
    userId: user._id,
    text: options.text || '',
  };

  var insertData = validateReply(data);
  return processText(options.text)
    .then(function(parsedMessage) {
      insertData.html = parsedMessage.html;
      insertData.lang = parsedMessage.lang;
      insertData._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;

      return Reply.create(insertData);
    })
    .bind({
      reply: undefined
    })
    .then(function(reply) {
      this.reply = reply;

      return updateRepliesTotal(topic._id);
    })

    .then(function() {
      var reply = this.reply;

      stats.event('new_reply', {
        userId: user._id,
        forumId: topic.forumId,
        topicId: topic._id,
        replyId: reply._id
      });

      return reply;
    });
}

/**
 * Given a set of topicIds, returns a hash
 * of userIds of users replying to those messages
 */
function findSampleReplyingUserIdsForTopics(topicIds) {
  return Reply.aggregate([{
      $match: {
        topicId: { $in: topicIds }
      }
    }, {
      $project: {
        _id: 0,
        topicId: 1,
        userId: 1
      }
    }, {
      $group: {
        _id: "$topicId",
        userIds: {
          $addToSet: "$userId"
        }
      }
    }, {
      $project: {
        _id: 1,
        userIds: { $slice: ["$userIds", 5] }
      }
    }])
    .read(mongoReadPrefs.secondaryPreferred)
    .exec()
    .then(function(docs) {
      return _.reduce(docs, function(memo, doc) {
        memo[doc._id] = doc.userIds;
        return memo;
      }, {})

    });
}

module.exports = {
  findById: findById,
  findByTopicId: findByTopicId,
  findByTopicIds: findByTopicIds,
  findTotalByTopicId: findTotalByTopicId,
  findTotalsByTopicIds: findTotalsByTopicIds,
  findByIdForForum: findByIdForForum,
  findByIdForForumAndTopic: findByIdForForumAndTopic,
  createReply: Promise.method(createReply),
  findSampleReplyingUserIdsForTopics: findSampleReplyingUserIdsForTopics
};
