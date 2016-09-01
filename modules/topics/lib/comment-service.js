'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var Topic = require('gitter-web-persistence').Topic;
var Reply = require('gitter-web-persistence').Reply;
var Comment = require('gitter-web-persistence').Comment;
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

function findTotalsByReplyIds(ids) {
  return mongooseUtils.getEstimatedCountForIds(Comment, 'replyId', ids);
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

function updateLastModifiedForTopicAndReply(topicId, replyId) {
  return Promise.join(
    Topic.findById(topicId).exec(),
    Reply.findById(replyId).exec(),
    function(fatTopic, fatReply) {
      var newLastModified = new Date();

      fatTopic.lastModified = newLastModified;
      fatReply.lastModified = newLastModified;

      return Promise.join(
        fatTopic.save(),
        fatReply.save());
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

      return updateLastModifiedForTopicAndReply(reply.topicId, reply._id);
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
  findTotalsByReplyIds: findTotalsByReplyIds,
  findByIdForForumTopicAndReply: findByIdForForumTopicAndReply,
  createComment: Promise.method(createComment)
};
