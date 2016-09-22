"use strict";

var Lazy = require('lazy.js');
var _ = require('lodash');
var CommentStrategy = require('../comment-strategy');
var commentService = require('gitter-web-topics/lib/comment-service');

function CommentsForReplyStrategy() {
  this.commentsMap = null;
}

CommentsForReplyStrategy.prototype = {
  preload: function(replyIds) {
    return commentService.findByReplyIds(replyIds.toArray())
      .bind(this)
      .then(function(comments) {
        this.commentsMap = _.groupBy(comments, 'replyId');

        return this.commentStrategy.preload(Lazy(comments));
      });

  },

  map: function(replyId) {
    var comments = this.commentsMap[replyId];
    if (!comments) return [];

    return _.map(comments, this.commentStrategy.map, this.commentStrategy);
  },

  name: 'CommentsForReplyStrategy'
};

CommentsForReplyStrategy.standard = function(options) {
  var strategy = new CommentsForReplyStrategy();

  strategy.commentStrategy = new CommentStrategy({
    currentUserId: options.currentUserId
  });

  return strategy;
}

module.exports = CommentsForReplyStrategy;
