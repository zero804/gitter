"use strict";

var Promise = require('bluebird');
var getVersion = require('gitter-web-serialization/lib/get-model-version');
var UserIdStrategy = require('./user-id-strategy');
var CommentReactionStrategy = require('gitter-web-topic-serialization/lib/rest/comment-reaction-strategy');
var mapReactionCounts = require('gitter-web-topic-serialization/lib/map-reaction-counts');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function CommentStrategy(options) {
  var doUserLookups = options && options.lookups && options.lookups.indexOf('user') >= 0;
  this.userLookups = doUserLookups ? {} : null;
}

CommentStrategy.prototype = {
  preload: function(comments) {
    if (comments.isEmpty()) return;

    var strategies = [];

    if (this.reactionStrategy) {
      strategies.push(this.reactionStrategy.preload(comments));
    }

    var userIds = comments.map(function(i) { return i.userId; });
    strategies.push(this.userStrategy.preload(userIds));

    return Promise.all(strategies);
  },

  mapUser: function(userId) {
    if (this.userLookups) {
      if (!this.userLookups[userId]) {
        this.userLookups[userId] = this.userStrategy.map(userId);
      }

      return userId;
    } else {
      return this.userStrategy.map(userId);
    }
  },

  map: function(comment) {
    var id = comment.id || comment._id && comment._id.toHexString();

    return {
      id: id,
      body: {
        text: comment.text,
        html: comment.html
      },

      // TODO: should we incude which topic/reply it is for?

      // TODO: support options.user
      user: this.mapUser(comment.userId),

      reactions: mapReactionCounts(comment),
      ownReactions: this.reactionStrategy ? this.reactionStrategy.map(comment) : undefined,

      sent: formatDate(comment.sent),
      editedAt: formatDate(comment.editedAt),
      lastChanged: formatDate(comment.lastChanged),
      v: getVersion(comment)
    };
  },

  postProcess: function(serialized) {
    if (this.userLookups) {
      return {
        items: serialized.toArray(),
        lookups: {
          users: this.userLookups
        }
      };
    } else {
      return serialized.toArray();
    }
  },

  name: 'CommentStrategy'
};

/**
 *
 */
CommentStrategy.standard = function(options) {
  var currentUserId = options && options.currentUserId;
  var strategy = new CommentStrategy({
    lookups: options && options.lookups
  });

  strategy.userStrategy = UserIdStrategy.slim();

  if (currentUserId) {
    strategy.reactionStrategy = new CommentReactionStrategy({
      currentUserId: currentUserId
    });
  }

  return strategy;
}

module.exports = CommentStrategy;
