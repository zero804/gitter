'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Comment = require('gitter-web-persistence').Comment;
var debug = require('debug')('gitter:app:topics:comment-service');


function createComment(user, forum, reply, commentInfo) {
  var insertData = {
    forumId: reply.forumId,
    topicId: reply.topicId,
    replyId: reply._id,
    userId: user._id,
    text: commentInfo.text || '',
    html: commentInfo.html || ''
  };
  return Comment.create(insertData)
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
