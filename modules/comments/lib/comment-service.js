'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var Comment = require('gitter-web-persistence').Comment;
var debug = require('debug')('gitter:app:topics:comment-service');
var processText = require('gitter-web-text-processor');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validators = require('gitter-web-validators');


// TODO: we'll need better ways to get pages of comments per rely rather than
// this function to just get all of it.
function findByReplyIds(ids) {
  if (!ids.length) return [];

  return Comment.find({ replyId: { $in: ids } })
    .lean()
    .exec();
}

function findTotalsByReplyIds(ids) {
  return mongooseUtils.getCountForIds(Comment, 'replyId', ids);
}

function validateComment(data) {
  if (!validators.validateMarkdown(data.text)) {
    throw new StatusError(400, 'Text is invalid.')
  }

  return data;
}

function createComment(user, reply, options) {
  var data = {
    forumId: reply.forumId,
    topicId: reply.topicId,
    replyId: reply._id,
    userId: user._id,
    text: options.text || '',
  };

  return Promise.try(function() {
      return validateComment(data);
    })
    .bind({})
    .then(function(insertData) {
      this.insertData = insertData;
      return processText(options.text)
    })
    .then(function(parsedMessage) {
      var data = this.insertData;

      data.html = parsedMessage.html;
      data.lang = parsedMessage.lang;
      data._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;

      return Comment.create(data);
    })
    .then(function(comment) {
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
  findByReplyIds: findByReplyIds,
  findTotalsByReplyIds: findTotalsByReplyIds,
  createComment: createComment
};
