'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var Topic = persistence.Topic;
var Reply = persistence.Reply;
var Comment = persistence.Comment;
var ForumNotification = persistence.ForumNotification;
var ForumReaction = persistence.ForumReaction;
var debug = require('debug')('gitter:app:topics:comment-service');
var liveCollections = require('gitter-web-live-collection-events');
var processText = require('gitter-web-text-processor');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateComment = require('./validate-comment');
var validators = require('gitter-web-validators');
var topicNotificationEvents = require('gitter-web-topic-notifications/lib/forum-notification-events');

function findById(commentId) {
  return Comment.findById(commentId)
    .lean()
    .exec();
}

// TODO: we'll need better ways to get pages of comments per rely rather than
// this function to just get all of it.
function findByReplyId(id) {
  return Comment.find({ replyId: id })
    .lean()
    .exec();
}

function findByReplyIds(ids) {
  if (!ids.length) return [];

  return Comment.find({ replyId: { $in: ids } })
    .lean()
    .exec();
}

function findTotalByReplyId(id, options) {
  options = options || {};

  return mongooseUtils.getEstimatedCountForId(Comment, 'replyId', id, {
    read: options.read
  });
}

function findTotalsByReplyIds(ids, options) {
  options = options || {};

  return mongooseUtils.getEstimatedCountForIds(Comment, 'replyId', ids, {
    read: options.read
  });
}

function findByIdForForumTopicAndReply(forumId, topicId, replyId, commentId) {
  return findById(commentId)
    .then(function(comment) {
      if (!comment) return null;

      // make sure the comment is in the specified forum
      if (!mongoUtils.objectIDsEqual(comment.forumId, forumId)) return null;

      // make sure the comment is in the specified topic
      if (!mongoUtils.objectIDsEqual(comment.topicId, topicId)) return null;

      // make sure the comment is in the specified reply
      if (!mongoUtils.objectIDsEqual(comment.replyId, replyId)) return null;

      return comment;
    });
}

function updateCommentsTotal(topicId, replyId) {
  debug("updateCommentsTotal %s %s", topicId, replyId);

  var now = new Date();
  var nowTime = now.getTime();
  var nowString = now.toISOString();


  return findTotalByReplyId(replyId)
    .bind({
      topic: undefined,
      reply: undefined,
    })
    .then(function(commentsTotal) {
      var topicUpdate = {
        $max: {
          lastChanged: now,
          lastModified: now,
        }
      };

      var replyUpdate = {
        $max: {
          lastChanged: now,
          lastModified: now
        },
        $set: {
          commentsTotal: commentsTotal
        }
      };

      return [
        Topic.findOneAndUpdate({ _id: topicId }, topicUpdate, { new: true }).exec(),
        Reply.findOneAndUpdate({ _id: replyId }, replyUpdate, { new: true }).exec()
      ];
    })
    .spread(function(topic, reply) {
      this.topic = topic;
      this.reply = reply;

      if (topic) {
        debug("Topic updated: %j", {
          now: now,
          lastChanged: topic.lastChanged,
          lastModified: topic.lastModified,
        });
      }

      if (topic && topic.lastModified.getTime() === nowTime) {
        // if the topic update won, patch the topics live collection
        liveCollections.topics.emit('patch', topic.forumId, topicId, {
          lastChanged: nowString,
        });
      } else {
        debug('We lost the topic update race.');
      }

      if (reply) {
        debug("Reply updated: %j", {
          now: now,
          lastChanged: reply.lastChanged,
          lastModified: reply.lastModified,
          commentsTotal: reply.commentsTotal
        });
      }

      if (reply && reply.lastModified.getTime() === nowTime) {
        // if the reply update won, patch the replies live collection
        liveCollections.replies.emit('patch', reply.forumId, reply.topicId, replyId, {
          lastChanged: nowString,
          commentsTotal: reply.commentsTotal
        });
      } else {
        debug('We lost the reply update race.');
      }
    })
    .then(function() {
      // return the things that got updated
      return [this.topic, this.reply];
    });
}

function createComment(user, reply, options) {
  var data = {
    forumId: reply.forumId,
    topicId: reply.topicId,
    replyId: reply._id,
    userId: user._id,
    text: options.text || '',
  };

  var insertData = validateComment(data);

  // make these all be the exact same instant
  insertData.sent = insertData.lastChanged = insertData.lastModified = new Date();

  return processText(options.text)
    .then(function(parsedMessage) {
      insertData.html = parsedMessage.html;
      insertData.lang = parsedMessage.lang;
      insertData._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;

      return Comment.create(insertData);
    })
    .bind({
      comment: undefined
    })
    .tap(function(comment) {
      return topicNotificationEvents.createComment(comment);
    })
    .then(function(comment) {
      this.comment = comment;

      return updateCommentsTotal(reply.topicId, reply._id);
    })
    .then(function() {
      var comment = this.comment;

      stats.event('new_topic_comment', {
        userId: user._id,
        forumId: reply.forumId,
        topicId: reply.topicId,
        replyId: reply._id,
        commentId: comment._id
      });

      return comment;
    });
}

var updateTopicLastModified = mongooseUtils.makeLastModifiedUpdater(Topic);
var updateReplyLastModified = mongooseUtils.makeLastModifiedUpdater(Reply);

/* private */
function updateCommentFields(topicId, replyId, commentId, fields) {
  var lastModified = new Date();

  var query = {
    _id: commentId
  };
  var update = {
    $set: fields,
    $max: {
      lastModified: lastModified
    }
  };
  return Comment.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec()
    .tap(function() {
      return [
        updateReplyLastModified(commentId, lastModified),
        updateTopicLastModified(commentId, lastModified)
      ];
    });
}

function updateComment(user, comment, fields) {
  // you can only update the text field for now.
  var text = fields.text;

  if (text === comment.text) return comment;

  if (!validators.validateMarkdown(text)) {
    throw new StatusError(400, 'Text is invalid.');
  }

  var userId = user._id;
  var forumId = comment.forumId;
  var topicId = comment.topicId;
  var replyId = comment.replyId;
  var commentId = comment._id;

  return processText(text)
    .bind({ updatedComment: undefined })
    .then(function(parsedMessage) {
      return updateCommentFields(topicId, replyId, commentId, {
        editedAt: new Date(),
        text: text,
        html: parsedMessage.html,
        lang: parsedMessage.lang,
        _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
      });
    })
    .then(function(updatedComment) {
      stats.event('update_topic_comment', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        replyId: replyId,
        commentId: commentId
      });

      liveCollections.comments.emit('update', updatedComment);

      return updatedComment;
    });
}

function deleteComment(user, comment) {
  var userId = user._id;
  var forumId = comment.forumId;
  var topicId = comment.topicId;
  var replyId = comment.replyId;
  var commentId = comment._id;

  return Promise.join(
      Comment.remove({ _id: commentId }).exec(),
      ForumNotification.remove({ commentId: commentId }).exec(),
      ForumReaction.remove({ commentId: commentId }).exec())
    .then(function() {
      return updateCommentsTotal(topicId, replyId);
    })
    .then(function() {
      stats.event('delete_topic_comment', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        replyId: replyId,
        commentId: commentId,
      });

      liveCollections.comments.emit('remove', comment);
    }
  )
}

module.exports = {
  findById: findById,
  findByReplyId: findByReplyId,
  findByReplyIds: findByReplyIds,
  findTotalByReplyId: findTotalByReplyId,
  findTotalsByReplyIds: findTotalsByReplyIds,
  findByIdForForumTopicAndReply: findByIdForForumTopicAndReply,
  updateCommentsTotal: updateCommentsTotal,
  createComment: Promise.method(createComment),
  updateComment: Promise.method(updateComment),
  deleteComment: deleteComment
};
