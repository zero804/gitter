"use strict";

var Promise = require('bluebird');
var Lazy = require('lazy.js');
var _ = require('lodash');
var getVersion = require('../get-model-version');
var CommentStrategy = require('./comment-strategy');
var UserIdStrategy = require('./user-id-strategy');
var commentService = require('gitter-web-comments/lib/comment-service');


function formatDate(d) {
  return d ? d.toISOString() : null;
}

function getIdString(obj) {
  return obj.id || obj._id && obj._id.toHexString();
}

function ReplyStrategy(options) {
  options = options || {};

  // useLookups will be set to true if there are any lookups that this strategy
  // understands.
  var useLookups = false;
  var userLookups;
  if (options.lookups) {
    if (options.lookups.indexOf('user') !== -1) {
      useLookups = true;
      userLookups = {};
    }
  }

  var userStrategy;
  var commentStrategy;

  var commentsMap;
  var commentsTotalMap;

  this.preload = function(replies) {
    if (replies.isEmpty()) return;

    var replyIds = replies.map(getIdString).toArray();

    var strategies = [];

    return Promise.try(function() {
        if (options.includeComments) {
          return commentService.findByReplyIds(replyIds)
            .then(function(comments) {
              commentsMap = _.groupBy(comments, 'replyId');

              commentStrategy = new CommentStrategy();
              strategies.push(commentStrategy.preload(Lazy(comments)));
            });
        }
      })
      .then(function() {
        if (options.includeCommentsTotals) {
          return commentService.findTotalsByReplyIds(replyIds)
            .then(function(commentsTotals) {
              commentsTotalMap = commentsTotals;
            });
        }
      })
      .then(function() {
        // TODO: no user strategy necessary if options.user is passed in
        userStrategy = new UserIdStrategy();
        var userIds = replies.map(function(i) { return i.userId; });
        strategies.push(userStrategy.preload(userIds));

        return Promise.all(strategies);
      });
  };

  function mapUser(userId) {
    if (userLookups) {
      if (!userLookups[userId]) {
        userLookups[userId] = userStrategy.map(userId);
      }

      return userId;
    } else {
      return userStrategy.map(userId);
    }
  }

  this.map = function(reply) {
    var id = reply.id || reply._id && reply._id.toHexString();

    var comments = options.includeComments ? commentsMap[id] || [] : undefined;
    var commentsTotal = options.includeCommentsTotals ? commentsTotalMap[id] || 0 : undefined;

    return {
      id: id,
      body: {
        text: reply.text,
        html: reply.html,
      },

      // TODO: should we incude which topic it is for?

      // TODO: support options.user
      user: mapUser(reply.userId),

      comments: options.includeComments ? comments.map(commentStrategy.map) : undefined,
      commentsTotal: options.includeCommentsTotals ? commentsTotal : undefined,

      sent: formatDate(reply.sent),
      editedAt: reply.editedAt ? formatDate(reply.editedAt) : null,
      lastModified: reply.lastModified ? formatDate(reply.lastModified) : null,
      v: getVersion(reply)
    };
  };

  this.postProcess = function(serialized) {
    if (useLookups) {
      return {
        items: serialized.toArray(),
        lookups: {
          users: userLookups
        }
      };
    } else {
      return serialized.toArray();
    }
  }
}

ReplyStrategy.prototype = {
  name: 'ReplyStrategy',
};

module.exports = ReplyStrategy;
