'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var Topic = persistence.Topic;
var Reply = persistence.Reply;
var Comment = persistence.Comment;
var ForumSubscription = persistence.ForumSubscription;
var ForumNotification = persistence.ForumNotification;
var ForumReaction = persistence.ForumReaction;
var debug = require('debug')('gitter:app:topics:reply-service');
var liveCollections = require('gitter-web-live-collection-events');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateReply = require('./validate-reply');
var validators = require('gitter-web-validators');
var _ = require('lodash');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs')
var topicNotificationEvents = require('gitter-web-topic-notifications/lib/forum-notification-events');

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

  var now = new Date();
  var nowTime = now.getTime();
  var nowString = now.toISOString();


  return findTotalByTopicId(topicId)
    .bind({
      topic: undefined
    })
    .then(function(repliesTotal) {
      var update = {
        $max: {
          lastChanged: now,
          lastModified: now,
        },
        $set: {
          repliesTotal: repliesTotal
        }
      };

      return Topic.findOneAndUpdate(query, update, { new: true })
        .exec();
    })
    .then(function(topic) {
      this.topic = topic;

      if (topic) {
        debug("Topic updated: %j", {
          now: now,
          lastChanged: topic.lastChanged,
          lastModified: topic.lastModified,
          repliesTotal: topic.repliesTotal
        });
      }

      // we only have to check the one field to know
      if (!topic || topic.lastModified.getTime() !== nowTime) {
        debug('We lost the topic update race.');
        return;
      }

      // if this update won, then patch the live collection with the latest
      // lastChanged values and also the new total replies.
      liveCollections.topics.emit('patch', topic.forumId, topicId, {
        lastChanged: nowString,
        repliesTotal: topic.repliesTotal
      })
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

  // make these all be the exact same instant
  insertData.sent = insertData.lastChanged = insertData.lastModified = new Date();

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
    .tap(function(reply) {
      return topicNotificationEvents.createReply(reply);
    })
    .then(function(reply) {
      this.reply = reply;

      return updateRepliesTotal(topic._id);
    })
    .then(function() {
      var reply = this.reply;

      stats.event('new_topic_reply', {
        userId: user._id,
        forumId: topic.forumId,
        topicId: topic._id,
        replyId: reply._id
      });

      return reply;
    });
}

var updateTopicLastModified = mongooseUtils.makeLastModifiedUpdater(Topic);

/* private */
function updateReplyFields(topicId, replyId, fields) {
  var lastModified = new Date();

  var query = {
    _id: replyId
  };
  var update = {
    $set: fields,
    $max: {
      lastModified: lastModified
    }
  };
  return Reply.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec()
    .tap(function() {
      return updateTopicLastModified(topicId, lastModified);
    });
}

function updateReply(user, reply, fields) {
  // you can only update the text field for now.
  var text = fields.text;

  if (text === reply.text) return reply;

  if (!validators.validateMarkdown(text)) {
    throw new StatusError(400, 'Text is invalid.');
  }

  var userId = user._id;
  var forumId = reply.forumId;
  var topicId = reply.topicId;
  var replyId = reply._id;

  return processText(text)
    .then(function(parsedMessage) {
      return updateReplyFields(topicId, replyId, {
        editedAt: new Date(),
        text: text,
        html: parsedMessage.html,
        lang: parsedMessage.lang,
        _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
      });
    })
    .then(function(updatedReply) {
      stats.event('update_topic_reply', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        replyId: replyId
      });

      // Might as well issue an update rather than a patch because almost the
      // entire thing changed.
      liveCollections.replies.emit('update', updatedReply);

      return updatedReply;
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

function deleteReply(user, reply) {
  var userId = user._id;
  var forumId = reply.forumId;
  var topicId = reply.topicId;
  var replyId = reply._id;

  return Promise.join(
      Reply.remove({ _id: replyId }).exec(),
      Comment.remove({ replyId: replyId }).exec(),
      ForumSubscription.remove({ replyId: replyId }).exec(),
      ForumNotification.remove({ replyId: replyId }).exec(),
      ForumReaction.remove({ replyId: replyId }).exec())
    .then(function() {
      // only update the total after we deleted the reply
      return updateRepliesTotal(topicId);
    })
    .then(function() {
      stats.event('delete_topic_reply', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        replyId: replyId,
      });

      liveCollections.replies.emit('remove', reply);
    }
  )
}

module.exports = {
  findById: findById,
  findByTopicId: findByTopicId,
  findByTopicIds: findByTopicIds,
  findTotalByTopicId: findTotalByTopicId,
  findTotalsByTopicIds: findTotalsByTopicIds,
  findByIdForForum: findByIdForForum,
  findByIdForForumAndTopic: findByIdForForumAndTopic,
  updateRepliesTotal: updateRepliesTotal,
  createReply: Promise.method(createReply),
  updateReply: Promise.method(updateReply),
  findSampleReplyingUserIdsForTopics: findSampleReplyingUserIdsForTopics,
  deleteReply: deleteReply
};
