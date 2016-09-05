'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var Topic = require('gitter-web-persistence').Topic;
var Reply = require('gitter-web-persistence').Reply;
var Comment = require('gitter-web-persistence').Comment;
var debug = require('debug')('gitter:app:topics:comment-service');
var liveCollections = require('gitter-web-live-collection-events');
var processText = require('gitter-web-text-processor');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateComment = require('./validate-comment');


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

  var lastModified = new Date();

  var update = {
    $max: {
      lastModified: lastModified
    }
  };

  return Promise.join(
    Topic.findOneAndUpdate({ _id: topicId }, update, { new: true }).exec(),
    Reply.findOneAndUpdate({ _id: replyId }, update, { new: true }).exec())
    .bind({
      topic: undefined,
      reply: undefined
    })
    .spread(function(topic, reply) {
      if (topic) {
        debug("topic.lastModified: %s, lastModified: %s", topic.lastModified, lastModified)
      }

      if (topic && topic.lastModified.getTime() === lastModified.getTime()) {
        // if the topic update won, patch the topics live collection
        liveCollections.topics.emit('patch', topic.forumId, topicId, {
          lastModified: lastModified
        });
      } else {
        debug('We lost the topic update race.');
      }

      if (reply) {
        debug("reply.lastModified: %s, lastModified: %s", reply.lastModified, lastModified)
      }

      if (reply && reply.lastModified.getTime() === lastModified.getTime()) {
        // if the reply update won, patch the replies live collection
        return findTotalByReplyId(replyId)
          .then(function(commentsTotal) {
            liveCollections.replies.emit('patch', reply.forumId, reply.topicId, replyId, {
              lastModified: lastModified,
              commentsTotal: commentsTotal
            });
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
    .then(function(comment) {
      this.comment = comment;

      return updateCommentsTotal(reply.topicId, reply._id);
    })
    .then(function() {
      var comment = this.comment;

      stats.event('new_comment', {
        userId: user._id,
        forumId: reply.forumId,
        topicId: reply.topicId,
        replyId: reply._id,
        commentId: comment._id
      });

      return comment;
    });
}

module.exports = {
  findByReplyId: findByReplyId,
  findByReplyIds: findByReplyIds,
  findTotalByReplyId: findTotalByReplyId,
  findTotalsByReplyIds: findTotalsByReplyIds,
  findByIdForForumTopicAndReply: findByIdForForumTopicAndReply,
  createComment: Promise.method(createComment)
};
