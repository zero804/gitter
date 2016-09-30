"use strict";

var Promise = require('bluebird');
var getVersion = require('gitter-web-serialization/lib/get-model-version');
var UserIdStrategy = require('./user-id-strategy');
var CommentsForReplyStrategy = require('./topics/comments-for-reply-strategy');
var ReplySubscriptionStrategy = require('./topics/reply-subscription-strategy');
var ReplyReactionStrategy = require('gitter-web-topic-serialization/lib/rest/reply-reaction-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function ReplyStrategy(options) {
  var doUserLookups = options && options.lookups && options.lookups.indexOf('user') >= 0;
  this.userLookups = doUserLookups ? {} : null;
}

ReplyStrategy.prototype = {
  preload: function(replies) {
    if (replies.isEmpty()) return;

    var strategies = [];

    if (this.commentsForReplyStrategy) {
      var replyIds = replies.map(function(reply) {
        return reply._id;
      });

      strategies.push(this.commentsForReplyStrategy.preload(replyIds));
    }

    if (this.subscriptionStrategy) {
      strategies.push(this.subscriptionStrategy.preload(replies));
    }

    if (this.reactionStrategy) {
      strategies.push(this.reactionStrategy.preload(replies));
    }

    var userIds = replies.map(function(i) { return i.userId; });
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

  map: function(reply) {
    var id = reply.id || reply._id && reply._id.toHexString();

    return {
      id: id,
      body: {
        text: reply.text,
        html: reply.html,
      },

      user: this.mapUser(reply.userId),
      subscribed: this.subscriptionStrategy ? this.subscriptionStrategy.map(reply) : undefined,

      comments: this.commentsForReplyStrategy ? this.commentsForReplyStrategy.map(id) : undefined,
      commentsTotal: reply.commentsTotal,

      ownReactions: this.reactionStrategy ? this.reactionStrategy.map(reply) : undefined,

      sent: formatDate(reply.sent),
      editedAt: formatDate(reply.editedAt),
      lastChanged: formatDate(reply.lastChanged),
      v: getVersion(reply)
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

  name: 'ReplyStrategy',
};


/**
 * Returns replies WITHOUT any nested comments
 */
ReplyStrategy.standard = function(options) {
  var currentUserId = options && options.currentUserId;
  var strategy = new ReplyStrategy({
    lookups: options && options.lookups
  });

  strategy.userStrategy = UserIdStrategy.slim();

  if (currentUserId) {
    strategy.reactionStrategy = new ReplyReactionStrategy({
      currentUserId: currentUserId
    });

    strategy.subscriptionStrategy = new ReplySubscriptionStrategy({
      currentUserId: currentUserId
    });
  }

  return strategy;
}

/**
 * Returns replies WITH selected nested comments
 */
ReplyStrategy.nested = function(options) {
  var strategy = ReplyStrategy.standard(options);

  strategy.commentsForReplyStrategy = CommentsForReplyStrategy.standard({
    currentUserId: options && options.currentUserId
  });

  return strategy;
}


module.exports = ReplyStrategy;
