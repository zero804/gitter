'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Comment = require('gitter-web-persistence').Comment;
var debug = require('debug')('gitter:app:topics:comment-service');
var processText = require('gitter-web-text-processor');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];


function createComment(user, forum, reply, options) {
  return processText(options.text)
    .then(function(parsedMessage) {
      var insertData = {
        forumId: reply.forumId,
        topicId: reply.topicId,
        replyId: reply._id,
        userId: user._id,
        text: options.text || '',
        html: parsedMessage.html,
        lang: parsedMessage.lang,
        _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
      };

      return Comment.create(insertData);
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
  createComment: createComment
};
